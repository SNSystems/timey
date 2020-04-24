/*eslint quotes: ["error", "single"]*/
'use strict';

const csv_parser = require('csv-parser');
const fs = require('fs');

/**
 *
 * @param pathname{string}
 * @return {Promise<{}[]>}
 */
exports.read = (pathname) => {
    let result = [];
    return new Promise ((fulfill, reject) =>
        fs.createReadStream (pathname)
            .pipe (csv_parser ())
            .on ('data', row => result.push (row))
            .on ('error', err => reject (err))
            .on ('end', () => fulfill (result)));
};

/**
 * Converts value to either a number or NaN. This function only considers strings containing only
 * digits with optional leading sign as valid numbers.
 *
 * @param v{string}  The input string to be converted.
 * @return {Number}  If v is a (strict) integer, return it as a Number otherwise NaN.
 */
function to_number (v) {
    return (/^[-+]?(\d+)$/.test(v)) ? Number(v) : NaN;
}

/***
 * Converts any values of keys in the supplied object to Number where they appear to be valid
 * integers.
 *
 * @param obj{{}}  The object whose keys are to be converted.
 * @return {{}} An object whose keys are those of 'obj' and whose values are those of `obj` but
 * converted to Number where possible.
 */
function object_values_as_number (obj) {
    let d = {};
    Object.keys(obj).forEach (key => {
        const value = to_number (obj[key]);
        d[key] = isNaN (value) ? obj[key] : value;
    });
    return d;
}

/**
 *
 * @param arr{(*[])[]}
 * @return {(*[])[]}
 */
exports.values_to_int = (arr) => {
    return arr.map (obj => object_values_as_number (obj));
};



/**
 * Flatten the two-dimensional array 'arr' to a string where there is one line for each element of
 * the outer dimension and an space-separated value for each element for the inner. For example,
 * [ [1,2,3], [4,5,6] ] becomes "1 2 3\n4 5 6\n".
 *
 * @param arr{Array<Array<*>>} A 2 dimensional array of values.
 * @return {string} The 'arr' array as CSV string.
 */
exports.from_array2d = (arr) => {
    return arr.reduce ((acc, inner) => acc + inner.join (',') + '\n', '');
};
