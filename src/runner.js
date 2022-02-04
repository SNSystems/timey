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

/**
 * Spawns a process and returns a promise.
 * @param command  Path of the executable to be run.
 * @param args  An array of the arguments to be passed to the command.
 * @param options  An options Object passed directly to child_process.spawn().
 * @param output  An optional function taking a string that the process wrote to either stdout or stderr.
*/
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
      .on('close', (code, signal) => {
        if (code === 0) {
          resolve(code)
        } else {
          reject(new Error(`process error code=${code} signal=${signal} (${command} ${args.join(' ')})`))
        }
      })
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
      const args = ['--repo', repo, '-o', objectFile, ticketFile]
      const exitCode = await run(repo2obj, args, options, verbose)
      if (exitCode !== 0) {
        throw new Error(`repo2obj process exit code ${exitCode} (repo2obj ${args.join(' ')}`)
      }
      return objectFile
    },

    runRldGen: async function (argv, test, output /* optional callback */) {
      await run(rldGen, [
        '--append', 0,
        '--common', test.common,
        '--external', test.external,
        '--linkonce', test.linkonce,
        '--modules', test.modules,
        '--prefix-length', test['prefix-length'],
        '--section-size', test['section-size'],
        '--external-fixups', test['external-fixups'],
        '--internal-fixups', test['internal-fixups'],

        '--output-directory', '.',
        '--repo', argv.repoName,
        '--triple', 'x86_64-pc-linux-gnu-repo',
        '--progress'
      ], options, verbose, output)
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
        await run(command, args, options, verbose)
        const time = Date.now() - start
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
