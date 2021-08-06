'use strict'
const { spawn } = require('child_process')
const path = require('path')

function mean (samples) {
  return samples.reduce((acc, value) => acc + value, 0) / samples.length
}

function standardDeviation (samples, m) {
  const squareDiffs = samples.map(value => {
    const diff = value - m
    return diff * diff
  })
  return Math.sqrt(mean(squareDiffs))
}

function confidenceInterval (samples, mean) {
  const z = 1.96 // 95% confidence
  return z * (standardDeviation(samples, mean) / Math.sqrt(samples.length))
}

async function run (command, args, options, verbose, output /* optional callback */) {
  return new Promise((resolve, reject) => {
    if (verbose) {
      console.log(`spawn: ${command} ${args.join(' ')}`)
    }
    const log = (channel) => (data) => {
      if (verbose) {
        process.stdout.write(`[${path.basename(command, '.exe')}] ${channel}: ${data.toString()}`)
      }
      if (output) {
        return output(data)
      }
    }
    const proc = spawn(command, args, options)
      .on('close', resolve)
      .on('error', reject)
    proc.stdout.on('data', log('stdout'))
    proc.stderr.on('data', log('stderr'))
  })
}
exports.run = run

exports.runner = function (workDir, rldGen, repo2obj, verbose) {
  const options = { cwd: workDir }
  return {
    runRepo2Obj: async function (repo, ticketFile, objectFile) {
      const exitCode = await run(repo2obj, ['--repo', repo, '-o', objectFile, ticketFile], options, verbose)
      if (exitCode !== 0) {
        throw new Error(`repo2obj process exit code ${exitCode}`)
      }
      return objectFile
    },

    runRldGen: async function (argv, test, output /* optional callback */) {
      const exitCode = await run(rldGen, [
        '--append', 0,
        '--common', test.common,
        '--external', test.external,
        '--linkonce', test.linkonce,
        '--modules', test.modules,
        '--prefix-length', test['prefix-length'],
        '--section-size', test['section-size'],
        '--xfixup-size', test['external-fixups'],
        '--ifixup-size', test['internal-fixups'],

        '--output-directory', '.',
        '--repo', argv.repoName,
        '--triple', 'x86_64-pc-linux-gnu-repo',
        '--progress'
      ], options, verbose, output)
      if (exitCode !== 0) {
        throw new Error(`rld-gen process exit code ${exitCode}`)
      }
      return true
    },

    timedRun: async function (command, args, count, output) {
      const iterate = async function (c) {
        const runNumber = count - c
        if (verbose) {
          console.log(`Timing run ${runNumber}`)
        }
        if (output) {
          output(runNumber)
        }
        const start = Date.now()
        const exitCode = await run(command, args, options, verbose)
        const time = Date.now() - start
        if (exitCode !== 0) {
          throw new Error(`process exit code ${exitCode}`)
        }
        if (c === 0) {
          return [time]
        }
        const arr = await iterate(c - 1)
        arr.push(time)
        return arr
      }

      const arr = await iterate(count - 1)
      const m = mean(arr)
      return [m, confidenceInterval(arr, m)]
    }
  }
}
