#!/usr/bin/env node
/*eslint quotes: ["error", "single"]*/
'use strict';

const assert = require ('assert').strict;
const path = require ('path');

const csv = require ('./modules/csv');

/**
 * Reads a pair of CSV files given by path names 'a' and 'b'. Returns an array of two arrays.
 *
 * @param a{string} Path of the first file to be read.
 * @param b{string} Path of the second file to be read.
 * @return {Promise<[{}[], {}[]]>}
 */
function read_two_source_files (a, b) {
    return Promise.all ([csv.read (a), csv.read (b)]);
}

/**
 * Reduces an array of rows, each of which has an object with major, minor, and common keys, to
 * an entry for each unique major key with the largest corresponding minor value. That is, an input
 * such as:
 *  [
 *    { major: 1, minor: 1, common: 10},
 *    { major: 1, minor: 2, common: 20},
 *    { major: 2: minor: 1, common: 30}
 *  ]
 * will become:
 *  [
 *    { major: 1, minor: 2, common: 20},
 *    { major: 2, minor: 1m common: 30}
 *  ]
 *
 * @param arr{({})[]} An array of objects.
 * @param major{string}  The major object key; that is, the key that will become the tools first
 * output value.
 * @param minor{string} The minor object key: we find the largest minor value for each major.
 * @return {({})[]}
 */
function find_entries (arr, major, minor) {
    let result = [];
    while (arr.length > 0) {
        const first = arr.shift ();

        // Produce an entry which has the largest minor value of all entries in 'arr' with the major
        // key matching that of 'first'.
        result.push (arr.reduce ((acc, current) =>
            current [major] === acc[major] && current[minor] > acc[minor] ? current : acc, first));

        // 'arr' becomes the collection of entries that have a major value not equal to this one.
        arr = arr.filter (obj => obj [major] !== first [major]);
    }
    return result;
}

/**
 * Checks that the arrays a and b each contain the same number of elements each of which contains an
 * object with matching value for the 'major' key.
 *
 * @param a{{}[]}  An array of objects.
 * @param b{{}[]}  An array of objects.
 * @param major{string}  The object property to be compared.
 * @return {boolean}  True if the elements of the two input arrays do not each have elements with
 * matching values for the 'major' key.
 */
function validate_major (a, b, major) {
    const major_value = el => el[major];
    a = a.map (major_value);
    b = b.map (major_value);
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; ++index) {
        if (a[index] !== b[index]) {
            return false;
        }
    }
    return true;
}

/**
 *
 * @param arr{{}[]}  An array of objects.
 * @param minor{string}  The key to be checked.
 * @return {boolean}
 */
function validate_minor (arr, minor) {
    return arr.length === 0 ||
        arr.every (el => el.hasOwnProperty (minor) && el[minor] === arr[0][minor]);
}

/**
 *
 * @param arr{{}[]}
 * @param major{string} The major property name.
 * @param minor{string} The minor property name.
 * @param common{string} The common property name.
 * @result{boolean} True if all three of the major, minor, and common properties are present in all
 * members of the 'arr' array.
 */
function validate_keys (arr, major, minor, common) {
    return arr.every (el => el.hasOwnProperty (major) && el.hasOwnProperty (minor) && el.hasOwnProperty (common));
}

const argv = require ('yargs')
    .strict ()
    .command ('$0 [options] <csv1> <csv2>', 'Reduce inputs csv1 and csv2 to a single CSV file', (yargs) => {
        const columns = ['external', 'linkonce', 'time'];
        yargs
            .options ({
                'major': {default: 'external', choices:columns, describe: 'The major key', type: 'string'},
                'minor': {default: 'linkonce', choices:columns, describe: 'The minor key', type: 'string'},
                'common': {default: 'time', choices:columns, describe: 'The common key', type: 'string'}
            });
    })
    .help ()
    .argv;
read_two_source_files (argv.csv1, argv.csv2)
    .then (r => {
        const [ra, rb] = r;
        if (ra.length !== rb.length) {
            throw new Error ('The number of rows in the two input files does not match');
        }
        if (!validate_keys (ra, argv.major, argv.minor, argv.common)) {
            throw new Error (`One of the required keys was missing in a field of ${argv.csv1}`);
        }
        if (!validate_keys (rb, argv.major, argv.minor, argv.common)) {
            throw new Error (`One of the required keys was missing in a field of ${argv.csv2}`);
        }
        const rae = find_entries (csv.values_to_int (ra), argv.major, argv.minor);
        const rbe = find_entries (csv.values_to_int (rb), argv.major, argv.minor);
        if (rae.length !== rbe.length) {
            throw new Error (`The arrays produced after finding the largest ${argv.minor} entries are of different length`);
        }
        if (!validate_minor (rae, argv.minor)) {
            throw new Error (`Input file "${argv.csv1}" has invalid entries for the ${argv.minor} key`);
        }
        if (!validate_minor (rbe, argv.minor)) {
            throw new Error (`Input file "${argv.csv2}" has invalid entries for the ${argv.minor} key`);
        }
        if (!validate_major (rae, rbe, argv.major)) {
            throw new Error (`Input files have ${argv.major} keys that do not match`);
        }

        // Column header names drawn from the major key and the two input file names.
        let result = [[
            'symbols',
            path.basename (argv.csv1, '.csv'),
            path.basename (argv.csv2, '.csv')
        ]];
        assert.equal (rae.length, rbe.length);
        for (let index = 0; index < rae.length; ++index) {
            assert.deepEqual (rae[index][argv.major], rbe[index][argv.major]);
            result.push ([rae[index][argv.major], rae[index].time, rbe[index].time]);
        }

        console.log (csv.from_array2d (result));
    })
    .catch (err => console.error (err));
