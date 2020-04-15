#!/usr/bin/env node
/*eslint quotes: ["error", "single"]*/
'use strict';

const cli_progress = require ('cli-progress');
const fs = require ('fs');
const os = require ('os');
const {promisify} = require ('util');

const csv = require ('./modules/csv');
const run = require ('./modules/run');
const timey = require ('./modules/timey');

/**
 * @param r{run.runner}
 * @param params{params} The test parameters (values including the linker to time, the max number of
 *     linkonce and external symbols, the increment, the number of modules.
 * @param output{string}
 * @param force{boolean}
 * @param verbose{boolean}
 * @result{Promise<>}
 */
function do_timings (r, params, output, force, verbose) {
    const linkonce = params.linkonce;
    const external = params.external;
    const increment = params.increment;
    const num_tasks = Math.floor ((linkonce * external) / (increment * increment));

    let bar;
    if (!verbose) {
        bar = new cli_progress.SingleBar ({}, cli_progress.Presets.shades_classic);
        bar.start (num_tasks);
    }

    return timey.check_work_directory (r.get_work_dir (), force)
        .then (() => {
            return timey.serialize_tasks (Array (num_tasks)
                .fill (0)
                .map ((_, index) => {
                    // Convert an index in the task array to a position in the 2d array of
                    // external/linkonce combinations to be generated.
                    const num_external = (Math.floor (index / (linkonce / increment)) + 1) * increment;
                    const num_linkonce = (index % (linkonce / increment) + 1) * increment;

                    // Time a specific configuration of a particular linker.
                    return () => timey.single_run (r,
                        params.linker, // the linker to be timed
                        params.modules, // the number of modules to generate
                        num_external, // the number of external symbols to generate
                        num_linkonce // the number of linkonce symbols to generate
                    ).then (time => {
                        if (bar) {
                            bar.update (index + 1);
                        }
                        return [num_external, num_linkonce, time];
                    });
                }));
        })
        .then (results => {
            if (bar) {
                bar.stop ();
            }

            // Write the results to a file in a format that GnuPlot can display.
            const write_output = text => promisify (fs.writeFile) (output, text);
            const write_stdout = text => process.stdout.write (text);

            // Send the results to the chosen output file/stdout.
            return (output === '-' ? write_stdout : write_output) ('external,linkonce,time\n' + csv.from_array2d (results));
        })
        .catch (err => {
            if (bar) {
                bar.stop ();
            }
            return Promise.reject(err);
        });
}

function main () {
    const argv = require ('yargs')
        .strict ()
        .command ('$0 [options]', 'Generate linker timing data', (yargs) => {
            yargs.options ({
                'bin-dir': {
                    default: '/usr/bin',
                    describe: 'The directory containing LLVM executables',
                    normalize: true
                },
                'work-dir': {
                    default: os.tmpdir (),
                    describe: 'The directory to be used for intermediate (work) files',
                    normalize: true
                },
                'repo-name': {
                    default: 'repository.db',
                    describe: 'The program repository file name'
                },
                'o': {
                    default: '-',
                    describe: 'The file to which the results will be written',
                    alias: 'output'
                },
                'f': {
                    default: false,
                    boolean: true,
                    describe: 'Continue even if the work directory is not empty',
                    alias: 'force'
                },
                'linker': {
                    choices: Object.keys (timey.linkers),
                    default: Object.keys (timey.linkers)[0],
                    describe: 'The linker to be timed'
                },
                'debug': {
                    default: false,
                    boolean: true,
                    describe: 'Produce additional debugging output',
                    hidden: true
                },
                'verbose': {default: false, type: 'boolean', describe: 'Produce verbose output'},

                'increment': {
                    default: 1000,
                    number: true,
                    describe: 'The number by which the symbol counts are incremented on each run'
                },
                'external': {
                    default: 10000,
                    number: true,
                    describe: 'The number of external symbols defined by each module'
                },
                'linkonce': {
                    default: 10000,
                    number: true,
                    describe: 'The number of linkonce symbols defined by each module'
                },
                'modules': {
                    default: 100,
                    number: true,
                    describe: 'The number of modules to be created'
                },
            });
        })
        .help ()
        .group(['external', 'linkonce', 'increment', 'modules'], 'Control the content of the generated repository:')
        .group(['bin-dir', 'work-dir', 'repo-name', 'output'], 'Control the location of tools and output:')
        .argv;

    do_timings (
        run.runner (argv.binDir, argv.workDir, argv.repoName, argv.verbose),
        {
            linker: timey.linkers[argv.linker],
            linkonce: argv.linkonce,
            external: argv.external,
            increment: argv.increment,
            modules: argv.modules
        },
        argv.output,
        argv.force,
        argv.verbose
    ).catch (err => {
        if (argv.debug) {
            console.trace (err);
        } else {
            console.error (err);
        }
        process.exitCode = 1;
    });
}

main ();
