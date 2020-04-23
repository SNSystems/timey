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
    return spawn ('git', ['rev-parse', 'HEAD'], {cwd: repo_path, capture: [ 'stdout', 'stderr' ]})
        .then(result => result.stdout.toString ().trim())
        .catch(err => console.error ('[spawn] stderr: ', err.stderr));
}

/**
 * Returns an object containing the git commit hashes for the llvm-project-prepo, pstore, and rld
 * repositories.
 *
 * @param llvm_root{string} The path to the llvm-project-prepo git clone.
 * @return {Promise<{llvm_project_prepo_commit: string, pstore_commit: string, rld_commit: string} | void>}
 */
function revisions (llvm_root) {
    const llvm = git_revision (llvm_root);
    const pstore = git_revision (path.join (llvm_root, 'pstore'));
    const rld = git_revision (path.join (llvm_root, 'rld'));
    return Promise.all ([llvm, pstore, rld])
        .then (values => {
            return {
                llvm_project_prepo_commit: values[0],
                pstore_commit: values[1],
                rld_commit: values[2]
            };
        }).catch (err => console.error (err));
}

function short (revision) {
    return revision.slice (0, 5);
}

require ('yargs')
    .strict ()
    .command ('$0 [llvm-project-prepo-root]', 'Update the results README file', yargs => {
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
                    llvm_project_prepo_short: short (revisions[0]),
                    llvm_project_prepo_long: revisions[0],
                    pstore_short: short (revisions[1]),
                    pstore_long: revisions[1],
                    rld_short: short (revisions[2]),
                    rld_long: revisions[2]
                }
            ]))
            .then (tv => {
                const [template, view] = tv;
                process.stdout.write (mustache.render (template, view));
            }).catch (err => console.error (err));
    })
    .help()
    .argv;
