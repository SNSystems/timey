#!/usr/bin/env node
/*eslint quotes: ["error", "single"]*/
'use strict';

const assert = require('assert').strict;
const path = require ('path');

const csv = require ('./csv');

/**
 * Reads a pair of CSV files given by path names 'a' and 'b'. Returns an array of two arrays.
 *
 * @param a{string} Path of the first file to be read.
 * @param b{string} Path of the second file to be read.
 * @return {Promise<[({string}[])[], ({string}[])[]]>}
 */
function read_two_source_files (a, b) {
    return csv.read (a).then (ra => csv.read (b).then (rb => [ra, rb]));
}

/**
 *
 * @param arr{({})[]} An array of objects.
 * @param major{string}  The major object key; that is, the key that will become the tools first output value.
 * @param minor{string} The minor object key: we find the largest minor value for each major.
 * @return {({})[]}
 */
function find_entries (arr, major, minor) {
    let result = [];
    while (arr.length > 0) {
        const first = arr.shift ();

        // Produce an entry which has the largest minor value of all entries in 'arr' with the major
        // key matching that of 'first'.
        result.push (arr.reduce ((acc, current) => current [major] === acc[major] && current[minor] > acc[minor] ? current : acc, first));

        // 'arr' becomes the collection of entries that have a major value not equal to this one.
        arr = arr.filter(obj => obj [major] !== first [major]);
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
        if (a[index] !==  b[index]) {
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
    return arr.length === 0 || arr.every (el => el.hasOwnProperty (minor) && el[minor] === arr[0][minor]);
}

const major = 'external';
const minor = 'linkonce';

const src_a = './results/lld.csv';
const src_b = './results/rld.csv';
read_two_source_files (src_a, src_b)
    .then (r => {
        const [ra, rb] = r;
        if (ra.length !== rb.length) {
            throw new Error ('The number of rows in the two input files does not match');
        }
        const rae = find_entries (csv.values_to_int (ra), major, minor);
        const rbe = find_entries (csv.values_to_int (rb), major, minor);
        if (rae.length !== rbe.length) {
            throw new Error (`The arrays produced after finding the largest ${minor} entries are of different length`);
        }
        if (!validate_minor (rae, minor)) {
            throw new Error (`Input file "${src_a}" has invalid entries for the ${minor} key`);
        }
        if (!validate_minor (rbe, minor)) {
            throw new Error (`Input file "${src_b}" has invalid entries for the ${minor} key`);
        }
        if (!validate_major (rae, rbe, major)) {
            throw new Error (`Input files have ${major} keys that do not match`);
        }

        let result = [[major, path.basename (src_a, '.csv'), path.basename (src_b, '.csv')]];
        assert.equal (rae.length, rbe.length);
        for (let index = 0; index < rae.length; ++index) {
            assert.deepEqual(rae[index][major], rbe[index][major]);
            result.push ([rae[index][major], rae[index].time, rbe[index].time]);
        }

        console.log (csv.from_array2d(result));
    })
    .catch (err => console.error (err));
