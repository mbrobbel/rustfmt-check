import * as core from "@actions/core";
import { Cargo } from "@actions-rs/core";
import stringArgv from "string-argv";

const output: string[] = [];

const rustfmt = async (
  options: string[] = [],
  args: string = core.getInput("args"),
  toolchain = core.getInput("toolchain")
): Promise<string[]> => {
  output.splice(0, output.length);
  return Cargo.get()
    .then(async (cargo) =>
      cargo.call(
        [`+${toolchain}`, `fmt`]
          .concat(stringArgv(args))
          .concat([`--`])
          .concat(options),
        {
          listeners: {
            stdout: (data: Buffer) => {
              output.push(data.toString().trim());
            },
          },
        }
      )
    )
    .then(() => output.filter(Boolean));
};

export default rustfmt;
