#!/usr/bin/env node
const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const { copyFile } = require('fs').promises

const async = require('async')
const mustache = require('mustache')

const chart = require('./src/chart')
const host = require('./src/host')
const { run } = require('./src/runner')

async function fork (command, args, verbose) {
  return new Promise((resolve, reject) => {
    if (verbose) {
      console.log(`fork: ${command} ${args.join(' ')}`)
    }
    childProcess.fork(command, args, { cwd: process.cwd() })
      .on('close', resolve)
      .on('error', reject)
  })
}

/**
 * Runs "git rev-parse HEAD" in the given directory to discover the synched commit.
 *
 * @param repoPath{string} The path to a git clone.
 * @param verbose{boolean} Produce verbose output?
 * @return {Promise<string | void>}  The synched revision hash.
 */
async function runGit (args, repoPath, verbose) {
  let output = ''
  await run('git', args, { cwd: repoPath }, verbose, data => { output += data })
  return output.toString().trim()
}

const workDir = path.join(process.cwd(), 'gen')
const resultsDir = path.join(process.cwd(), 'results')

async function runTest (obj, argv) {
  const { name, runs, params, linkers } = obj
  if (argv.time) {
    const timeyArgs = params.slice().concat(['--work-dir', workDir, '--prefix', name, '--runs', runs])
    if (argv.verbose) {
      timeyArgs.push('-v')
    }
    await fork('./src/timey.js', timeyArgs.concat(linkers), argv.verbose)
  }

  const fileName = l => name + '.' + l + '.csv'
  await Promise.all(linkers.slice().map(l => copyFile(path.join(workDir, fileName(l)), path.join(resultsDir, fileName(l)))))

  const plotName = path.join(workDir, name + '.plot')
  const chartArgs = ['--work-dir', workDir, '--xname', name, '--prefix', name, '--output', plotName]
  if (argv.verbose) {
    chartArgs.push('-v')
  }
  const _ = await chart.generatePlot (linkers, name, plotName, workDir, name, argv.verbose)

  const quote = x => '"' + x + '"'
  await run('gnuplot',
    [
      '-e', 'set output ' + quote(path.join(resultsDir, name + '.svg')),
      '-e', 'set title ' + quote(obj.title),
      '-e', 'set xlabel ' + quote(obj.xlabel),
      plotName
    ],
    { cwd: process.cwd() },
    argv.verbose
  )
}

async function main () {
  const argv = require('yargs')
    .strict()
    .command('$0 <llvm-project-prepo-root>', 'Update the results README file', yargs => {
      yargs.positional('llvm-project-prepo-root', {
        type: 'string',
        default: '.',
        describe: 'The path of the llvm-project-prepo git clone'
      })
      yargs.option('t', {
        alias: 'template',
        type: 'string',
        default: './results/results.tmpl.md',
        describe: 'The path of the README template Markdown file'
      })
      yargs.option('verbose', {
        alias: 'v',
        type: 'boolean',
        default: false,
        describe: 'Produce verbose output'
      })
      yargs.options('time', {
        type: 'boolean',
        default: true,
        describe: 'Perform timing runs (--no-time to regenerate from a previous run)'
      })
    })
    .help()
    .argv

  const RANGE = '0,50000,1000'
  const RUNS = 50
  const MODULES = 100
  const LINKERS = ['rld', 'ld.lld']

  const comparisons = {
    'prefix-length': {
      name: 'prefix-length',
      runs: RUNS,
      params: [
        '--common', 1000,
        '--external', 1000,
        '--linkonce', 1000,
        '--modules', 20,
        '--section-size', 16,
        '--prefix-length', '1,10000,2000',
        '--external-fixups', 0,
        '--internal-fixups', 0
      ],
      linkers: LINKERS,
      title: 'Symbol name length performance comparison',
      xlabel: 'Name prefix length'
    },
    external: {
      name: 'external',
      runs: RUNS,
      params: [
        '--common', 0,
        '--external', RANGE,
        '--linkonce', 0,
        '--modules', MODULES,
        '--section-size', 16,
        '--prefix-length', 1,
        '--external-fixups', 0,
        '--internal-fixups', 0
      ],
      linkers: LINKERS,
      title: 'External symbol performance comparison',
      xlabel: 'External symbols per module'
    },
    linkonce: {
      name: 'linkonce',
      runs: RUNS,
      params: [
        '--common', 0,
        '--external', 0,
        '--linkonce', RANGE,
        '--modules', MODULES,
        '--section-size', 16,
        '--prefix-length', 1,
        '--external-fixups', 0,
        '--internal-fixups', 0
      ],
      linkers: LINKERS,
      title: 'Linkonce symbol performance comparison',
      xlabel: 'Linkonce symbols per module'
    },
    common: {
      name: 'common',
      runs: RUNS,
      params: [
        '--common', RANGE,
        '--external', 0,
        '--linkonce', 0,
        '--modules', MODULES,
        '--section-size', 16,
        '--prefix-length', 1,
        '--external-fixups', 0,
        '--internal-fixups', 0
      ],
      linkers: LINKERS,
      title: 'Common symbol performance comparison',
      xlabel: 'Common symbols per module'
    },
    modules: {
      name: 'modules',
      runs: RUNS,
      params: [
        '--common', 0,
        '--external', 0,
        '--linkonce', 0,
        '--modules', '1,5000,100',
        '--section-size', 16,
        '--prefix-length', 1,
        '--external-fixups', 0,
        '--internal-fixups', 0
      ],
      linkers: LINKERS,
      title: 'Per-module overhead performance comparison',
      xlabel: 'Modules'
    },
    'section-size': {
      name: 'section-size',
      runs: RUNS,
      params: [
        '--common', 1000,
        '--external', 1000,
        '--linkonce', 1000,
        '--modules', 10,
        '--section-size', '0,32768,2048',
        '--prefix-length', 1,
        '--external-fixups', 0,
        '--internal-fixups', 0
      ],
      linkers: LINKERS,
      title: 'Section-size performance comparison',
      xlabel: 'Number of Values per Section (32-bits per Value)'
    },
    'external-fixups': {
      name: 'external-fixups',
      runs: RUNS,
      params: [
        '--common', 0,
        '--external', 100,
        '--linkonce', 0,
        '--modules', MODULES,
        '--section-size', 1000,
        '--prefix-length', 1,
        '--external-fixups', '0,3996,200',
        '--internal-fixups', 0
      ],
      linkers: LINKERS,
      title: 'External fixup performance comparison',
      xlabel: 'Number of external fixups per section'
    },
    'internal-fixups': {
      name: 'internal-fixups',
      runs: RUNS,
      params: [
        '--common', 0,
        '--external', 100,
        '--linkonce', 0,
        '--modules', MODULES,
        '--section-size', 1000,
        '--prefix-length', 1,
        '--external-fixups', 0,
        '--internal-fixups', '0,3996,200'
      ],
      linkers: LINKERS,
      title: 'Internal fixup performance comparison',
      xlabel: 'Number of internal fixups per section'
    }
  }
  let count = 0
  await async.mapSeries(Object.keys(comparisons), async (k) => {
    ++count
    process.stderr.write(`Stage ${count} of ${Object.keys(comparisons).length} (${k})\n`)
    await runTest(comparisons[k], argv)
  })

  const llvmPath = argv.llvmProjectPrepoRoot
  const pstorePath = path.join(argv.llvmProjectPrepoRoot, 'pstore')

  const revs = await Promise.all([
    runGit(['rev-parse', 'HEAD'], llvmPath, argv.verbose),
    runGit(['rev-parse', '--short', 'HEAD'], llvmPath, argv.verbose),
    runGit(['rev-parse', 'HEAD'], pstorePath, argv.verbose),
    runGit(['rev-parse', '--short', 'HEAD'], pstorePath, argv.verbose)
  ])
  const toRevObject = arr => { return { long: arr[0], short: arr[1] } }

  const llvmRev = toRevObject(revs.slice(0))
  const pstoreRev = toRevObject(revs.slice(2))

  const template = fs.readFileSync(argv.template, { encoding: 'utf-8' })
  const view = {
    host: host.description(),
    llvm_project_prepo_short: llvmRev.short,
    llvm_project_prepo_long: llvmRev.long,
    pstore_short: pstoreRev.short,
    pstore_long: pstoreRev.long,
    runs: RUNS,
    modules: MODULES,
    external_tp: comparisons.external?.params.join(' '),
    common_tp: comparisons.common?.params.join(' '),
    linkonce_tp: comparisons.linkonce?.params.join(' '),
    module_tp: comparisons.modules?.params.join(' '),
    section_size_tp: comparisons['section-size']?.params.join(' '),
    prefix_length_tp: comparisons['prefix-length']?.params.join(' '),
    external_fixups_tp: comparisons['external-fixups']?.params.join(' '),
    internal_fixups_tp: comparisons['internal-fixups']?.params.join(' ')
  }
  process.stdout.write(mustache.render(template, view))
  return 0
}

main()
  .then(exitCode => { process.exitCode = exitCode })
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
