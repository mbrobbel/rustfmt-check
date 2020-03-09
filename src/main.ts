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

    const head = github.context.payload.pull_request
      ? {
          sha: github.context.payload.pull_request.head.sha,
          ref: `refs/heads/${github.context.payload.pull_request.head.ref}`
        }
      : { sha: github.context.sha, ref: github.context.ref };

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
          base_tree: head.sha
        })
      )
      .then(async ({ data: { sha } }) =>
        git.git.createCommit({
          ...github.context.repo,
          message: "Format Rust code using rustfmt",
          tree: sha,
          parents: [head.sha]
        })
      )
      .then(async ({ data: { sha } }) =>
        git.git.updateRef({
          ...github.context.repo,
          ref: head.ref.replace("refs/", ""),
          sha
        })
      );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
