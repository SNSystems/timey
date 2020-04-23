#!/usr/bin/env node
/*eslint quotes: ["error", "single"]*/
'use strict';

const cli_progress = require ('cli-progress');
const fs = require ('fs');
const moment = require ('moment');
const os = require ('os');
const path = require ('path');
const {promisify} = require ('util');

const csv = require ('./modules/csv');
const run = require ('./modules/run');
const timey = require ('./modules/timey');

const writeFile = promisify (fs.writeFile);

/**
 * Convert an index in the task array to a position in the 2d array of
 * external/linkonce combinations to be generated.
 *
 * @param external{number}
 * @param linkonce{number}
 * @param increment{number}
 * @param index{number}
 * @return {{linkonce: number, external: number}}
 */
function index_to_coordinate (external, linkonce, increment, index) {
    const num_external = (Math.floor (index / (linkonce / increment)) + 1) * increment;
    const num_linkonce = (index % (linkonce / increment) + 1) * increment;
    return { external: num_external, linkonce: num_linkonce};
}

function bar_formatter (options, params, payload) {
    const format_value = (v, options, type) => (type === 'percentage') ? (options.autopaddingChar + v).slice (-3) : v;
    const format_bar = (progress, options) => {
        const complete_size = Math.round (progress * options.barsize);
        // Generate the bar string by stripping the pre-rendered strings.
        return options.barCompleteString.substr (0, complete_size) +
            options.barGlue +
            options.barIncompleteString.substr (0, options.barsize - complete_size);
    }

    const format_string = '[{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total} | {stage}';
    const elapsed_time = Math.round ((Date.now () - params.startTime) / 1000); // calculate elapsed time
    const context = Object.assign ({}, payload, {
        bar: format_bar (params.progress, options),
        percentage: format_value (Math.round (params.progress * 100), options, 'percentage'),
        total: format_value (params.total, options, 'total'),
        value: format_value (params.value, options, 'value'),
        eta: format_value (params.eta, options, 'eta'),
        eta_formatted: moment.duration (params.eta, 'seconds').humanize (),
        duration: format_value (elapsed_time, options, 'duration'),
        duration_formatted: moment.duration (elapsed_time, 'seconds').humanize (),
    });
    return format_string.replace (/\{(\w+)\}/g, (match, key) =>
        // Substitute known names and make no changes for unknown values.
        typeof context[key] === 'undefined' ? match : context[key]
    );
}


/**
 * @param r{run.runner}
 * @param params{{linkonce: number, external:number, increment:number, linkers:timey.linkers[]}}
 *     The test parameters (values including the linker to time, the max number of
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
        bar = new cli_progress.SingleBar ({
            format: bar_formatter,
            etaBuffer: 1000,
            etaAsynchronousUpdate: true,
            fps: 2,
        }, cli_progress.Presets.shades_classic);
        bar.start (num_tasks);
    }

    const lds_to_time = params.linkers; // The linkers to be timed.
    return timey.check_work_directory (r.get_work_dir (), force)
        .then (() => {
            return timey.serialize_tasks (Array (num_tasks)
                .fill (0)
                .map ((_, index) => {
                    const coordinate = index_to_coordinate (external, linkonce, increment, index);
                    // Time a specific configuration of a particular linker.
                    return () => timey.single_run (r,
                        lds_to_time,
                        params.modules, // the number of modules to generate
                        coordinate.external, // the number of external symbols to generate
                        coordinate.linkonce // the number of linkonce symbols to generate
                    ).then (times => {
                        if (bar) {
                            bar.update (index + 1);
                        }
                        return [coordinate, times];
                    });
                }));
        })
        .then (results => {
            // 'results' is now an array of values for each sample point. Each entry consists of an
            // object that describes its position in the grid ({external:n, linkonce:n}) and an
            // array of results, one for each of the requested linkers.
            if (bar) {
                bar.stop ();
            }

            // Write the results for each linker in a format that GnuPlot can understand.
            return lds_to_time.map((_, index) => {
                const r = results.map (value => [ value[0].external, value[0].linkonce, value[1][index] ]);
                const ld_name = Object.keys (timey.linkers)[index]; // The name of the linker.
                return writeFile (path.join (output, ld_name + '.csv'),
                    'external,linkonce,time\n' + csv.from_array2d (r)).catch (err => console.error (err));
            });
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
        .command ('$0 <linkers..>', 'Generate linker timing data', (yargs) => {
            yargs.positional('linkers', {
                describe: 'The linkers to be timed',
                choices: Object.keys (timey.linkers),
                type: 'string',
            });

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


    argv.linkers = argv.linkers.map (l => timey.linkers[l]);
    do_timings (
        run.runner (argv.binDir, argv.workDir, argv.repoName, argv.verbose),
        {
            linkers: argv.linkers,
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
