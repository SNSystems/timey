'use strict'

// Returns a function which, when called will yield a value dependent on the contents of array 'arr'. All members of
// 'arr' must be numbers.
//
// - If 'arr' is of length 1, it will always return arr[0].
// - If 'arr' has length greater than 3, it is treated as an array of 3 objects.
// - If 'arr' is of length 2 or 3, the values are treated as 'start', 'stop', and 'step' and repeated calls will yield
//   values from 'start' to 'stop' with the increment specified by 'step'. The end of the sequence is indicated by a
//   return value of null. If the step is 0, 1 will be used instead. For example:
//
//     [0, 2, 1] will yield the sequence 0, 1, 2, null
//     [0, 10, 2] will yield: 0, 2, 4, 6, 8, 10, null
//     [0, 2, 0] will yield: 0, 1, 2, null
//
// @param arr  An array of numbers
function getNext (arr) {
  if (arr.length === 1) {
    return () => arr[0]
  }
  const [start, stop, step] = arr
  let j = start
  return () => {
    if (j > stop) {
      return null
    }
    const result = j
    // Use 1 for step rather than undefined or 0.
    j += step || 1
    return result
  }
}

// Creates a new object whose keys are those in 'obj'. The value of each key (k) is produced by calling fn(obj[k]).
function mapValues (obj, fn) {
  const result = {}
  Object.keys(obj).forEach(k => { result[k] = fn(obj[k]) })
  return result
}

// Returns true if one or more values in the object 'obj' are null.
function anyNull (obj) {
  return Object.values(obj).reduce((acc, x) => acc || x === null, false)
}

function getStepper (obj) {
  const s = mapValues(obj, getNext)
  return () => {
    const sp = mapValues(s, x => x())
    return anyNull(sp) ? null : sp
  }
}

function coerce (arg) {
  const resl = String(arg).split(',').map(v => parseInt(v, 10))
  if (resl.some(isNaN)) {
    throw new Error('bad input')
  }
  if (resl.length === 2) {
    return resl.concat(1) // default step of 1.
  }
  if (resl.length !== 1 && resl.length !== 3) {
    throw new Error('Stepper value has an invalid number of values')
  }
  return resl
}

exports.getStepper = getStepper
exports.coerce = coerce
