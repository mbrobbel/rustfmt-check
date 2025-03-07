import * as core from '@actions/core';
import * as exec from '@actions/exec';
import stringArgv from 'string-argv';
import { EOL } from 'os';
const rustfmt = async (options = [], args = core.getInput('args')) => {
    let output = '';
    return exec
        .exec('cargo', ['fmt'].concat(stringArgv(args)).concat(['--']).concat(options), {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            }
        }
    })
        .then(() => output.trim().split(EOL).filter(Boolean));
};
export default rustfmt;
