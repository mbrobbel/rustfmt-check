import * as core from "@actions/core";
import { Cargo } from "@actions-rs/core";
import stringArgv from "string-argv";

// Get inputs
const toolchain = core.getInput("toolchain");
const args = core.getInput("args");

// Output buffer
const output: string[] = [];

const rustfmt = async (options: string[] = []): Promise<string[]> =>
  Cargo.get()
    .then(async cargo =>
      cargo.call(
        [`+${toolchain}`]
          .concat(stringArgv(args))
          .concat([`fmt`, `--`])
          .concat(options),
        {
          listeners: {
            stdline: (data: string) => {
              output.push(data);
            }
          }
        }
      )
    )
    .then(() => output.filter(Boolean));

export default rustfmt;
