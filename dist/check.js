import * as core from '@actions/core';
import * as exec from '@actions/exec';
import stringArgv from 'string-argv';
const check = async (args = core.getInput('args'), rustfmt_args = core.getInput('rustfmt-args')) => {
    let buffer = '';
    return exec
        .exec('cargo', ['+nightly', 'fmt']
        .concat(stringArgv(args))
        .concat(['--', '--emit', 'json'].concat(stringArgv(rustfmt_args))), {
        listeners: {
            stdout: (data) => {
                buffer += data.toString().trim();
            }
        }
    })
        .then(() => JSON.parse(buffer).flatMap((output) => output.mismatches.map((mismatch) => ({
        path: output.name,
        mismatch
    }))));
};
export default check;
