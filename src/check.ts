import * as core from "@actions/core";
import * as exec from "@actions/exec";
import stringArgv from "string-argv";
import { normalize_path } from "./path";

interface Output {
  name: string;
  mismatches: Mismatch[];
}

interface Result {
  path: string;
  mismatch: Mismatch;
}

interface Mismatch {
  original_begin_line: number;
  original_end_line: number;
  expected_begin_line: number;
  expected_end_line: number;
  original: string;
  expected: string;
}

const check = async (
  args: string = core.getInput("args"),
): Promise<Result[]> => {
  const result: Result[] = [];
  const add = (data: Buffer): void => {
    JSON.parse(data.toString().trim()).forEach((output: Output) => {
      output.mismatches.forEach((mismatch) => {
        result.push({
          path: normalize_path(output.name),
          mismatch,
        });
      });
    });
  };
  await exec.exec(
    "cargo",
    ["+nightly", "fmt"]
      .concat(stringArgv(args))
      .concat(["--", "--emit", "json"]),
    {
      listeners: {
        stdout: add,
      },
    },
  );
  return result;
};

export default check;
