import * as core from '@actions/core'
import * as exec from '@actions/exec'
import stringArgv from 'string-argv'
import { EOL } from 'os'

const rustfmt = async (
  options: string[] = [],
  args: string = core.getInput('args')
): Promise<string[]> => {
  let output = ''
  return exec
    .exec(
      'cargo',
      ['fmt'].concat(stringArgv(args)).concat(['--']).concat(options),
      {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString()
          }
        }
      }
    )
    .then(() => output.trim().split(EOL).filter(Boolean))
}

export default rustfmt
