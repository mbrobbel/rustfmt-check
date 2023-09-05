import * as core from "@actions/core";
import * as exec from "@actions/exec";
import stringArgv from "string-argv";
import { normalize_path } from "./path";

const rustfmt = async (
  options: string[] = [],
  args: string = core.getInput("args"),
): Promise<string[]> => {
  const output: string[] = [];
  return exec
    .exec(
      "cargo",
      ["fmt"].concat(stringArgv(args)).concat(["--"]).concat(options),
      {
        listeners: {
          stdout: (data: Buffer) => {
            output.push(normalize_path(data.toString().trim()));
          },
        },
      },
    )
    .then(() => output.filter(Boolean));
};

export default rustfmt;
