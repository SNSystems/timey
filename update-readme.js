#!/usr/bin/env node
const {spawn} = require ('child-process-promise');
const mustache = require ('mustache');
const path = require ('path');
const fsp = require ('fs').promises;

/**
 * Runs "git rev-parse HEAD" in the given directory to discover the synched commit.
 *
 * @param repo_path{string} The path to a git clone.
 * @return {Promise<string | void>}  The synched revision hash.
 */
function git_revision (repo_path) {
    const process_stdout = out => out.stdout.toString().trim();

    const long = spawn ('git', ['rev-parse', 'HEAD'], {cwd: repo_path, capture: [ 'stdout' ]});
    const short = spawn ('git', ['rev-parse', '--short', 'HEAD'], {cwd: repo_path, capture: [ 'stdout' ]});
    return Promise.all ([long, short])
        .then (revisions => {
            return {long: process_stdout (revisions[0]), short: process_stdout (revisions[1])};
        });
}

require ('yargs')
    .strict ()
    .command ('$0 <llvm-project-prepo-root>', 'Update the results README file', yargs => {
        yargs.positional('llvm-project-prepo-root', {
            type: 'string',
            default: '.',
            describe: 'The path of the llvm-project-prepo git clone'
        });
        yargs.option ('t', {
            alias: 'template',
            type: 'string',
            default: './results/README.tmpl.md',
            describe: 'The path of the README template Markdown file'
        });
    },  argv => {
        const llvm_root = argv.llvmProjectPrepoRoot;
        const llvm = git_revision (llvm_root);
        const pstore = git_revision (path.join (llvm_root, 'pstore'));
        const rld = git_revision (path.join (llvm_root, 'rld'));
        return Promise.all ([llvm, pstore, rld])
            .then (revisions => Promise.all ([
                fsp.readFile (argv.template, {encoding: 'utf-8'}),
                {
                    llvm_project_prepo_short: revisions[0].short,
                    llvm_project_prepo_long: revisions[0].long,
                    pstore_short: revisions[1].short,
                    pstore_long: revisions[1].long,
                    rld_short: revisions[2].short,
                    rld_long: revisions[2].long
                }
            ]))
            .then (tv => {
                const [template, view] = tv;
                process.stdout.write (mustache.render (template, view));
            }).catch (err => console.error (err));
    })
    .help()
    .argv;
