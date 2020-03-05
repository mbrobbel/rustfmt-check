import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile as readFileCallback } from "fs";
import { promisify } from "util";
import rustfmt from "./rustfmt";

const readFile = promisify(readFileCallback);

async function run(): Promise<void> {
  try {
    const token = core.getInput("token", { required: true });
    const git = new github.GitHub(token);

    await rustfmt(["-l"])
      .then(async paths =>
        git.git.createTree({
          ...github.context.repo,
          tree: await Promise.all(
            paths.map(
              async path =>
                ({
                  path: path.replace(`${process.env.GITHUB_WORKSPACE}/`, ""),
                  mode: "100644",
                  type: "blob",
                  content: await readFile(path, "utf8")
                } as any)
            )
          ),
          base_tree: github.context.sha
        })
      )
      .then(async ({ data: { sha } }) =>
        git.git.createCommit({
          ...github.context.repo,
          message: "Format Rust code using rustfmt",
          tree: sha,
          parents: [github.context.sha]
        })
      )
      .then(async ({ data: { sha } }) =>
        git.git.updateRef({
          ...github.context.repo,
          ref: github.context.ref.replace("refs/", ""),
          sha
        })
      );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
