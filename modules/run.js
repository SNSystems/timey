/*eslint quotes: ["error", "single"]*/
'use strict';

const {spawn} = require ('child-process-promise');
const {join, basename} = require ('path');

function spawn_process (bin_dir, executable, args, verbose, output) {
    const exe_path = join (bin_dir, executable);
    if (verbose) {
        console.log (`Running: ${exe_path} ${args.join (' ')}`);
    }
    const promise = spawn (exe_path, args);
    const log = (channel) => (data) => {
        if (verbose) {
            process.stdout.write (`[${basename (exe_path, '.exe')}] ${channel}: ${data.toString ()}`);
        }
        if (output) {
            return output (data);
        }
    };
    promise.childProcess.stdout.on ('data', log ('stdout'));
    promise.childProcess.stderr.on ('data', log ('stderr'));
    return promise;
}

/**
 * Produces an object with methods that will run rld-gen, repo2obj, rld, and lld.
 *
 * @param bin_dir{string}  The directory containing the LLVM executables.
 * @param work_dir{string}  The directory into which the test data will be written.
 * @param repo_name{string}  The name of the program repository database.
 * @param verbose{boolean}  Produce verbose output?
 * @returns{{}}  An object with methods that will run rld-gen, repo2obj, rld, and lld.
 */
exports.runner = (bin_dir, work_dir, repo_name, verbose = false) => {
    return {
        get_work_dir: () => work_dir,
        get_repo_name: () => repo_name,

        /**
         * Runs the rld-gen tool to generate linker test inputs.
         *
         * @param num_modules{Number}  The number of modules (ticket files) to be produced.
         * @param num_external_symbols{Number}  The number of external symbols per module.
         * @param num_linkonce_symbols{Number}  The number of linkonce symbols per module.
         * @param output{function=}  A function called when data is written by the process.
         * @returns {Promise<*>} A promise which is resolved once the process exits.
         */
        rld_gen: (num_modules, num_external_symbols, num_linkonce_symbols, output) => spawn_process (bin_dir, 'rld-gen', [
            '--external', num_external_symbols,
            '--linkonce', num_linkonce_symbols,
            '--modules', num_modules,
            '--output-directory', work_dir,
            '--repo', join (work_dir, repo_name),
            '--triple', 'x86_64-pc-linux-gnu-repo',
            '--progress'
        ], verbose, output),

        /**
         * Runs the repo2obj tool to convert a ticket file to an ELF object file.
         *
         * @param ticket_file{string}  The path of the repo ticket file to be converted.
         * @param output_file{string}  The path of the ELF object file to be created.
         * @param output{function=}  A function called when data is written by the process.
         * @returns {Promise<*>} A promise which is resolved once the process exits.
         */
        repo2obj: (ticket_file, output_file, output) => spawn_process (bin_dir, 'repo2obj', [
            '-o', output_file,
            '--repo', join (work_dir, repo_name),
            ticket_file
        ], verbose, output),

        /**
         * Runs the rld linker.
         *
         * @param ticket_files{Array<string>}  The path of the linker's input ticket files.
         * @param output_file{string}  The linker's output file.
         * @param output{function=}  A function called when data is written by the process.
         * @returns {Promise<*>} A promise which is resolved once the process exits.
         */
        rld: (ticket_files, output_file, output) => spawn_process (bin_dir, 'rld', [
            '-o', output_file,
            '--repo', join (work_dir, repo_name)
        ].concat (ticket_files), verbose, output),

        /**
         * Runs the lld linker.
         *
         * @param object_files{Array<string>}  The path of the linker's input ticket files.
         * @param output_file{string}  The linker's output file.
         * @param output{function=}  A function called when data is written by the process.
         * @returns {Promise<*>} A promise which is resolved once the process exits.
         */
        lld: (object_files, output_file, output) => spawn_process (bin_dir, 'ld.lld', [
            '-o', output_file
        ].concat (object_files), verbose, output),
    };
};
