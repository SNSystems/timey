#!/usr/bin/env node
const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const { copyFile } = require('fs').promises

const mustache = require('mustache')

const { run } = require('./src/runner')

const verbose = false

async function fork (command, args) {
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
 * @return {Promise<string | void>}  The synched revision hash.
 */
async function runGit (args, repoPath) {
  let output = ''
  await run('git', args, { cwd: repoPath }, verbose, data => { output += data })
  return output.toString().trim()
}

const workDir = path.join(process.cwd(), 'gen')
const resultsDir = path.join(process.cwd(), 'results')

async function runTest (obj) {
  const { name, runs, params, linkers } = obj
  const doTimey = true
  if (doTimey) {
    await fork('./src/timey.js',
      params.slice().concat(['--work-dir', workDir, '--prefix', name, '--runs', runs]).concat(linkers)
    )
  }

  const fileName = l => name + '.' + l + '.csv'
  await Promise.all(linkers.slice().map(l => copyFile(path.join(workDir, fileName(l)), path.join(resultsDir, fileName(l)))))

  const plotName = path.join(workDir, name + '.plot')
  await fork('./src/chart.js',
    ['--work-dir', workDir, '--xname', name, '--prefix', name, '--output', plotName].concat(linkers)
  )

  const quote = x => '"' + x + '"'
  await run('gnuplot',
    [
      '-e', 'set output ' + quote(path.join(resultsDir, name + '.svg')),
      '-e', 'set title ' + quote(obj.title),
      '-e', 'set xlabel ' + quote(obj.xlabel),
      plotName
    ],
    { cwd: process.cwd() },
    verbose
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
    })
    .help()
    .argv

  const RANGE = '0,50000,1000'
  const RUNS = 50
  const MODULES = 100
  const LINKERS = ['rld', 'ld.lld']

  const external = {
    name: 'external',
    runs: RUNS,
    params: ['--modules', MODULES, '--common', 0, '--linkonce', 0, '--external', RANGE],
    linkers: LINKERS,
    title: 'External symbol performance comparison',
    xlabel: 'External symbols per module'
  }
  await runTest(external)
  const linkonce = {
    name: 'linkonce',
    runs: RUNS,
    params: ['--modules', MODULES, '--common', 0, '--linkonce', RANGE, '--external', 0],
    linkers: LINKERS,
    title: 'Linkonce symbol performance comparison',
    xlabel: 'Linkonce symbols per module'
  }
  await runTest(linkonce)
  const common = {
    name: 'common',
    runs: RUNS,
    params: ['--modules', MODULES, '--common', RANGE, '--linkonce', 0, '--external', 0],
    linkers: LINKERS,
    title: 'Common symbol performance comparison',
    xlabel: 'Common symbols per module'
  }
  await runTest(common)

  const llvmPath = argv.llvmProjectPrepoRoot
  const pstorePath = path.join(argv.llvmProjectPrepoRoot, 'pstore')

  const revs = await Promise.all([
    runGit(['rev-parse', 'HEAD'], llvmPath),
    runGit(['rev-parse', '--short', 'HEAD'], llvmPath),
    runGit(['rev-parse', 'HEAD'], pstorePath),
    runGit(['rev-parse', '--short', 'HEAD'], pstorePath)
  ])
  const toRevObject = arr => { return { long: arr[0], short: arr[1] } }

  const llvmRev = toRevObject(revs.slice(0))
  const pstoreRev = toRevObject(revs.slice(2))

  const template = fs.readFileSync(argv.template, { encoding: 'utf-8' })
  const view = {
    llvm_project_prepo_short: llvmRev.short,
    llvm_project_prepo_long: llvmRev.long,
    pstore_short: pstoreRev.short,
    pstore_long: pstoreRev.long,
    runs: RUNS,
    modules: MODULES,
    external_tp: external.params.join(' '),
    common_tp: common.params.join(' '),
    linkonce_tp: linkonce.params.join(' ')
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
