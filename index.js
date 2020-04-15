#!/usr/bin/env node
/*eslint quotes: ["error", "single"]*/
'use strict';

const cli_progress = require ('cli-progress');
const fs = require ('fs');
const os = require ('os');
const {promisify} = require ('util');

const csv = require ('./modules/csv');
const run = require ('./modules/run');
const timey = require ('./modules/timey.js');

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

    const lomax = argv.linkonce;
    const extmax = argv.external;
    const incr = argv.increment;
    const num_tasks = Math.floor ((lomax * extmax) / (incr * incr));

    // start the progress bar with a total value of 200 and start value of 0
    let bar;
    if (!argv.verbose) {
        bar = new cli_progress.SingleBar ({}, cli_progress.Presets.shades_classic);
        bar.start (num_tasks);
    }

    timey.check_work_directory (argv.workDir, argv.force)
        .then (() => {
            return timey.serialize_tasks (Array (num_tasks)
                .fill ()
                .map ((_, i) => {
                    const r = run.runner (argv.binDir, argv.workDir, argv.repoName, argv.verbose);

                    // Convert an index in the task array (i) to a
                    const num_external = (Math.floor (i / (lomax / incr)) + 1) * incr;
                    const num_linkonce = (i % (lomax / incr) + 1) * incr;
                    return () => timey.single_run (r, timey.linkers[argv.linker], argv.modules, num_external, num_linkonce)
                        .then (time => {
                            if (bar) {
                                bar.update (i + 1);
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
            const write_output = text => promisify (fs.writeFile) (argv.output, text);
            const write_stdout = text => process.stdout.write (text);

            // Send the results to the chosen output file/stdout.
            return (argv.output === '-' ? write_stdout : write_output) ('external,linkonce,time\n' + csv.from_array2d (results));
        })
        .catch (err => {
            if (bar) {
                bar.stop ();
            }
            if (argv.debug) {
                console.trace (err.stack);
            } else {
                console.error (err);
            }
            process.exitCode = 1;
        });
}

main ();
