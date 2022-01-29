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
    const context = github.context;

    const head =
      context.eventName === "pull_request" && context.payload.pull_request
        ? {
            sha: context.payload.pull_request.head.sha,
            ref: `refs/heads/${context.payload.pull_request.head.ref}`,
          }
        : { sha: context.sha, ref: context.ref };

    await rustfmt(["-l"]).then(async (paths) =>
      paths.length === 0
        ? Promise.resolve()
        : octokit.rest.git
            .createTree({
              ...context.repo,
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
              octokit.rest.git.createCommit({
                ...context.repo,
                message: "Format Rust code using rustfmt",
                tree: sha,
                parents: [head.sha],
              })
            )
            .then(async ({ data: { sha } }) =>
              octokit.rest.git.updateRef({
                ...context.repo,
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
