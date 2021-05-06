#!/usr/bin/env node
'use strict'

// NodeJS modules
const fs = require('fs').promises
const os = require('os')
const path = require('path')

// 3rd party modules
const async = require('async')
const cliProgress = require('cli-progress')
const moment = require('moment')
const ObjectsToCsv = require('objects-to-csv')

const { findExecutable } = require('./find')
const { runner } = require('./runner')
const stepper = require('./stepper')

function linkerName (command) {
  return path.basename(command, '.exe')
}

function needsRepo2Obj (command) {
  return linkerName(command) !== 'rld'
}

const objectFileExtension = '.elf'

async function clean (workDir, repoName, numModules, verbose) {
  // We discard errors from unlink() to avoid failure if the file doesn't
  // exit.
  const unlink = name => {
    const p = path.join(workDir, name)
    if (verbose) {
      console.log(`unlink '${p}'`)
    }
    return fs.unlink(p)
      .then(() => undefined)
      .catch(_ => undefined) // Ignore errors.
  }
  // A function to build ticket/object file names.
  const getName = index => `t${Math.trunc(index / 2)}.o` + ((index % 2) ? objectFileExtension : '')
  // Delete the repo and all of the ticket/object files.
  return Promise.all(Array(numModules * 2).fill(null).map((_, index) => unlink(getName(index))).concat(unlink(repoName)))
}

function barFormatter (options, params, payload) {
  const formatValue = (v, options, type) => (type === 'percentage') ? (options.autopaddingChar + v).slice(-3) : v
  const formatBar = (progress, options) => {
    const completeSize = Math.round(progress * options.barsize)
    // Generate the bar string by stripping the pre-rendered strings.
    return options.barCompleteString.substr(0, completeSize) +
      options.barGlue +
      options.barIncompleteString.substr(0, options.barsize - completeSize)
  }

  const formatString = '[{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total} | {stage}'
  const elapsedTime = Math.round((Date.now() - params.startTime) / 1000) // calculate elapsed time
  const context = Object.assign({}, payload, {
    bar: formatBar(params.progress, options),
    percentage: formatValue(Math.round(params.progress * 100), options, 'percentage'),
    total: formatValue(params.total, options, 'total'),
    value: formatValue(params.value, options, 'value'),
    eta: formatValue(params.eta, options, 'eta'),
    eta_formatted: moment.duration(params.eta, 'seconds').humanize(),
    duration: formatValue(elapsedTime, options, 'duration'),
    duration_formatted: moment.duration(elapsedTime, 'seconds').humanize()
  })
  // Substitute known names and make no changes for unknown values.
  return formatString.replace(/\{(\w+)\}/g, (match, key) =>
    typeof context[key] === 'undefined' ? match : context[key]
  )
}

// A Fisher-Yates random shuffle (see <https://bost.ocks.org/mike/shuffle/>)
function shuffle (arr) {
  let m = arr.length
  while (m !== 0) {
    const r = Math.floor(Math.random() * m--)
    const t = arr[m]
    arr[m] = arr[r]
    arr[r] = t
  }
  return arr
}

async function performTest (progress, stage, test, argv) {
  const linkers = argv._
  const t = runner(argv.workDir, argv.rlgGen, argv.repo2obj, argv.verbose)

  await clean(argv.workDir, argv.repoName, test.modules, argv.verbose)
  await t.runRldGen(argv, test, data => {
    if (progress) {
      progress.update(stage + parseInt(data.toString(), 10) + 1, { stage: 'rld-gen' })
    }
  })
  stage += test.modules

  let repo2objWasRun = false
  const getLinkerInputFiles = async (linker) => {
    const ticketFiles = Array(test.modules).fill(null).map((_, index) => `t${index}.o`)
    if (!needsRepo2Obj(linker)) {
      // Just pass on the ticket files.
      return ticketFiles
    }

    if (repo2objWasRun) {
      // Find the object files we produced earlier.
      return ticketFiles.slice().map(x => x + objectFileExtension)
    }

    // Run repo2obj to convert each ticket file to an ELF object file for input to a traditional
    // linker. Yield the list of files we created.
    repo2objWasRun = true
    stage += ticketFiles.length
    return async.mapLimit(ticketFiles, os.cpus().length, async (ticketFile) => {
      if (progress) {
        progress.increment(1, { stage: 'repo2obj' })
      }
      return t.runRepo2Obj(argv.repoName, ticketFile, ticketFile + objectFileExtension)
    })
  }

  return async.mapSeries(linkers, async (linker) => {
    let inputFiles = await getLinkerInputFiles(linker)
    if (argv.verbose) {
      console.log(`starting timed run of ${linker}`)
    }
    // TODO: linker get args function of some kind.
    if (!needsRepo2Obj(linker)) {
      inputFiles = ['--repo', argv.repoName].concat(inputFiles)
    }

    const [mean, confidenceInterval] = await t.timedRun(linker, inputFiles, argv.runs, runNumber => {
      if (progress) {
        progress.update(stage + runNumber, { stage: linkerName(linker) })
      }
    })
    stage += argv.runs

    if (argv.verbose) {
      console.log(`(mean, confidence-interval)=(${mean},${confidenceInterval})`)
    }
    return { ...test, mean: mean, confidenceInterval: confidenceInterval }
  })
}

function makeTestArray (testParam) {
  // Check that at least one of the parameters has an associated range.
  if (!Object.values(testParam).reduce((acc, x) => acc || x.length > 1, false)) {
    throw new Error('There must be at least one variable argument')
  }

  // Now produce the collection of tests.
  const tests = []
  const fn = stepper.getStepper(testParam)
  let v
  while ((v = fn()) !== null) {
    tests.push(v)
  }
  shuffle(tests)
  return tests
}

function stepsPerTest (argv, testParam) {
  const linkers = argv._

  const fn = stepper.getStepper(testParam)
  let count = 0
  let v
  const r2oRun = linkers.some(needsRepo2Obj)
  while ((v = fn()) !== null) {
    count += linkers.length * argv.runs + v.modules + (r2oRun | 0) * v.modules
  }
  return count
}

const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')

async function main () {
  const steppers = {
    common: 0,
    external: '0,10000,1000',
    linkonce: 0,
    modules: 100,
    'section-size': 8
  }
  const argv = yargs(hideBin(process.argv))
    .command('$0', '[linkers..]', yargs => {
      Object.entries(steppers)
        .forEach(entry => yargs.option(entry[0], {
          group: 'Steppable arguments:',
          default: entry[1],
          coerce: stepper.coerce
        }))
      return yargs
    }, argv => {
      // console.log(argv)
    })
    .options('rld-gen', {
      normalize: true,
      default: 'rld-gen',
      description: 'The location of the rld-gen executable'
    })
    .options('repo2obj', {
      normalize: true,
      default: 'repo2obj',
      description: 'The location of the repo2obj executable'
    })
    .option('repo-name', {
      default: 'repo.db',
      description: 'The name of the program repository.'
    })
    .option('work-dir', {
      normalize: true,
      default: path.join(process.cwd(), 'gen'),
      description: 'The directory for work files and results.'
    })
    .option('prefix', {
      description: 'A prefix applied to the output CSV file names.'
    })
    .option('runs', {
      type: 'number',
      default: 30,
      description: 'The number of timed runs of each linker for each test.'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false,
      description: 'Run with verbose logging'
    })
    .help()
    .argv

  // Convert the names or paths given by the user for the linkers to the full path of each.
  argv._ = await Promise.all(argv._.map(findExecutable))
  const linkers = argv._
  if (linkers.length < 1) {
    throw new Error('Please specify at least one linker to time.')
  }

  // Get the full path of rld-gen and repo2obj.
  ([argv.rlgGen, argv.repo2obj] = await Promise.all([argv.rldGen, argv.repo2obj].map(findExecutable)))

  const testParam = Object.fromEntries(Object.keys(steppers).map(k => [k, argv[k]]))
  // Delete the step-able test parameters from argv.
  Object.keys(steppers).forEach(k => delete argv[k])

  const tests = makeTestArray(testParam)

  const spt = stepsPerTest(argv, testParam)
  let progress = null
  if (!argv.verbose) {
    progress = new cliProgress.SingleBar({
      barCompleteChar: '+',
      barIncompleteChar: '-',
      etaAsynchronousUpdate: true,
      etaBuffer: 10000,
      format: barFormatter,
      fps: 4
      // noTTYOutput: true, // Enable when debugging the progress bar!
    })
    progress.start(tests.length * spt)
  }

  try {
    let step = 0
    const result = await async.mapSeries(tests, async (test) => {
      const r = performTest(progress, step, test, argv)
      step += spt
      return r
    })

    if (progress) {
      progress.stop()
      progress = null
    }

    // result is an array with an element containing the timings for each test.
    const names = linkers.map(linkerName)
    const output = names.slice().map((name, index) => result.map(t => t[index]))
    await Promise.all(names.slice().map(async (name, index) => {
      const outPath = path.join(argv.workDir, argv.prefix + '.' + name + '.csv')
      if (argv.verbose) {
        console.log(`Output: ${outPath}`)
      }
      return new ObjectsToCsv(output[index]).toDisk(outPath)
    }))
  } finally {
    if (progress) {
      progress.stop()
    }
  }

  return 0
}

main()
  .then(exitCode => { process.exitCode = exitCode })
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
