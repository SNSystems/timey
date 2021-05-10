'use strict'

const os = require('os')

function stripSpaces (s) {
  const s$ = s.replace('  ', ' ')
  return s$ !== s ? stripSpaces(s$) : s$
}

function cpuDescription () {
  return os.cpus().reduce((acc, x) => {
    const pos = acc.find(c => c.model === x.model)
    if (pos) {
      ++pos.count
    } else {
      acc.push({ ...x, count: 1 })
    }
    return acc
  }, []).map(x => x.count + ' \u00D7 ' + stripSpaces(x.model)).join(', ')
}

function ramDescription () {
  return os.totalmem() / Math.pow(1024, 3) + ' GiB RAM'
}

function hostDescription () {
  return [
    os.platform(),
    os.release(),
    os.arch(),
    cpuDescription(),
    ramDescription()
  ].join(', ')
}
exports.description = hostDescription
