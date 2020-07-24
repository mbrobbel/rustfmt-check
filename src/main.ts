import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile as readFileCallback } from "fs";
import { promisify } from "util";
import rustfmt from "./rustfmt";

const readFile = promisify(readFileCallback);

async function run(): Promise<void> {
  try {
    const token = core.getInput("token", { required: true });
    const octokit = github.getOctokit(token);

    const head = octokit.context.payload.pull_request
      ? {
          sha: octokit.context.payload.pull_request.head.sha,
          ref: `refs/heads/${octokit.context.payload.pull_request.head.ref}`,
        }
      : { sha: octokit.context.sha, ref: octokit.context.ref };

    await rustfmt(["-l"]).then(async (paths) =>
      paths.length === 0
        ? Promise.resolve()
        : octokit.git
            .createTree({
              ...github.context.repo,
              tree: await Promise.all(
                paths.map(
                  async (path) =>
                    ({
                      path: path.replace(
                        `${process.env.GITHUB_WORKSPACE}/`,
                        ""
                      ),
                      mode: "100644",
                      type: "blob",
                      content: await readFile(path, "utf8"),
                    } as any)
                )
              ),
              base_tree: head.sha,
            })
            .then(async ({ data: { sha } }) =>
              octokit.git.createCommit({
                ...github.context.repo,
                message: "Format Rust code using rustfmt",
                tree: sha,
                parents: [head.sha],
              })
            )
            .then(async ({ data: { sha } }) =>
              octokit.git.updateRef({
                ...github.context.repo,
                ref: head.ref.replace("refs/", ""),
                sha,
              })
            )
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
