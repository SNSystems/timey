const fs = require('fs').promises
const path = require('path')

async function fileExists (filePath) {
  return fs.stat(filePath)
    .then(() => true)
    .catch(err => {
      const expected = new Set(['ENOENT', 'ENOTDIR'])
      if (expected.has(err.code)) {
        return false
      }
      // An unexpected error: propagate it out.
      throw err
    })
}

async function findOnPath (name) {
  const paths = process.env.PATH.split(path.delimiter).map(p => path.join(p, name))
  const idx = (await Promise.all(paths.slice().map(fileExists))).indexOf(true)
  return idx !== -1 ? paths[idx] : null
}

async function findExecutable (name) {
  const error = () => { throw new Error(`Cannot find executable '${name}'`) }
  if (name.includes(path.sep)) {
    return await fileExists(name) ? name : error()
  }
  const fullPath = await findOnPath(name)
  if (fullPath === null) {
    error()
  }
  return fullPath
}

exports.findExecutable = findExecutable
