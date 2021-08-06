#!/usr/bin/env node
// Node.js modules
const fs = require('fs')
const path = require('path')

// 3rd party modules
const async = require('async')
const csvParse = require('csv-parse')

const plotFilePrefix = `set terminal svg enhanced background rgb 'white'
set datafile separator ","
set ylabel "Time (ms)"
set key top left
set yrange [0<*:]
`

function csvPath (workDir, prefix, name) {
  return path.join(workDir, prefix + '.' + name + '.csv')
}

async function processCsvFile (path) {
  const records = []
  const columns = {}
  const parser = fs.createReadStream(path).pipe(csvParse({
    columns: true,
    cast: (value, context) => {
      if (context.header) {
        return value
      }
      columns[context.column] = context.index + 1
      return context.header ? value : parseFloat(value)
    }
  }))
  for await (const record of parser) {
    records.push(record)
  }
  return [columns, records]
}

function computeBestFitLine (records, xname, yname) {
  const sumX = records.reduce((acc, row) => acc + row[xname], 0)
  const sumY = records.reduce((acc, row) => acc + row[yname], 0)
  const sumXSquared = records.reduce((acc, row) => acc + row[xname] * row[xname], 0)
  const sumXY = records.reduce((acc, row) => acc + row[xname] * row[yname], 0)

  const N = records.length
  const m = (N * sumXY - (sumX * sumY)) / (N * sumXSquared - (sumX * sumX))
  const c = (sumY - m * sumX) / N
  return [m, c]
}

/**
 * @param linkers{string[]} A list of the linkers with CSV data
 * @param xname{string}
 * @param output{string}  The output path name. '-' means stdout.
 * @param workDir{string}
 * @param prefix{string}
 * @param verbose{boolean} Produce verbose output.
 * @return {Promise<string | void>}  The synched revision hash.
 */

async function generatePlot (linkers, xname, output, workDir, prefix, verbose) {
    const names = linkers.map(p => path.basename(p, '.exe'))
    const contents = await async.map(names, async n => processCsvFile(csvPath(workDir, prefix, n))) // [ [columns, records] ]

    // Define the per-linker line styles and best-fit line.
    const plotFile = contents.slice()
        .reduce((acc, result, index) => {
            const [m, c] = computeBestFitLine(result[1], xname, 'mean')
            return acc + `
set linetype ${index * 2 + 1} pointtype 1
set linetype ${index * 2 + 2} dashtype 2
f${index}(x) = ${m} * x + ${c}
`
        }, plotFilePrefix)

    if (verbose) {
        console.log (`xname=${xname}`)
    }
    // Plot the lines (2 per linker)
    const plotFile2 = contents.slice()
        .reduce((acc, result, index) => {
            const [columns, records] = result
            const [m, c] = computeBestFitLine(records, xname, 'mean')
            let r = acc
            if (index > 0) {
                r += ', \\\n'
            }
            if (!columns.hasOwnProperty(xname)) {
                throw new Error(`Column '${xname}' was not found in the CSV file`);
            }
            r += `    '${csvPath(workDir, prefix, linkers[index])}' using ${columns[xname]}:${columns.mean}:${columns.confidenceInterval} with yerrorbars title '${linkers[index]}', \\\n`
            r += `    f${index}(x) with lines title '${linkers[index]} (best fit {/:Italic y=${m.toFixed(3)}x+${c.toFixed(3)}})'`
            return r
        }, plotFile + '\nplot \\\n') + '\n'

    if (output === '-') {
        process.stdout.write(plotFile2)
    } else {
        await fs.writeFileSync(output, plotFile2)
    }
}

async function main () {
  const argv = require('yargs')
    .strict()
    .option('work-dir', {
      normalize: true,
      default: path.join(process.cwd(), 'gen'),
      description: 'The directory for work files and results.'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false,
      description: 'Run with verbose logging'
    })
    .option('xname', { default: 'external' })
    .option('prefix', {
      description: 'A prefix applied to the output CSV file names.',
      default: 'external'
    })
    .option('output', {
      alias: 'o',
      description: 'The file to which the gnuplot script will be written',
      default: '-'
    })
    .help()
    .argv

  await generatePlot (argv._, argv.xname, argv.output, argv.workDir, argv.prefix, argv.verbose);
  return 0
}

if (require.main === module) {
    main ()
        .then (exitCode => { process.exitCode = exitCode })
        .catch (err => {
            console.error (err)
            process.exitCode = 1
        })
}

exports.generatePlot = generatePlot
