#!/usr/bin/env node
// Node.js modules
const fs = require('fs')
const path = require('path')

// 3rd party modules
const async = require('async')
const csvParse = require('csv-parse')

const plotFilePrefix = `set terminal svg
set datafile separator ","
set ylabel "Time (ms)"
set key top left
set yrange [0<*:]
`

function csvPath (argv, name) {
  return path.join(argv.workDir, argv.prefix + '.' + name + '.csv')
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

  const linkers = argv._
  const names = linkers.map(p => path.basename(p, '.exe'))
  const contents = await async.map(names, async n => processCsvFile(csvPath(argv, n))) // [ [columns, records] ]

  // Define the per-linker line styles and best-fit line.
  const plotFile = contents.slice()
    .reduce((acc, result, index) => {
      const [m, c] = computeBestFitLine(result[1], argv.xname, 'mean')
      return acc + `
set linetype ${index * 2 + 1} pointtype 1
set linetype ${index * 2 + 2} dashtype 2
f${index}(x) = ${m} * x + ${c}
`
    }, plotFilePrefix)

  // Plot the lines (2 per linker)
  const plotFile2 = contents.slice()
    .reduce((acc, result, index) => {
      const [columns, records] = result
      const [m, c] = computeBestFitLine(records, argv.xname, 'mean')
      let r = acc
      if (index > 0) {
        r += ', \\\n'
      }
      r += `    '${csvPath(argv, linkers[index])}' using ${columns[argv.xname]}:${columns.mean}:${columns.confidenceInterval} with yerrorbars title '${linkers[index]}', \\\n`
      r += `    f${index}(x) with lines title '${linkers[index]} (best fit {/:Italic y=${m.toFixed(3)}x+${c.toFixed(3)}})'`
      return r
    }, plotFile + '\nplot \\\n') + '\n'

  if (argv.output === '-') {
    process.stdout.write(plotFile2)
  } else {
    await fs.writeFileSync(argv.output, plotFile2)
  }
  return 0
}

main()
  .then(exitCode => { process.exitCode = exitCode })
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
