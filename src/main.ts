import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile as readFileCallback } from "fs";
import { promisify } from "util";
import check from "./check";
import rustfmt from "./rustfmt";

const readFile = promisify(readFileCallback);

async function run(): Promise<void> {
  try {
    const token = core.getInput("token", { required: true });
    const octokit = github.getOctokit(token);
    const context = github.context;
    const mode = core.getInput("mode", { required: false });
    const message = core.getInput("commit-message", { required: false });

    switch (mode) {
      case "commit":
        {
          const head =
            context.eventName === "pull_request" && context.payload.pull_request
              ? {
                sha: context.payload.pull_request.head.sha,
                ref: `refs/heads/${context.payload.pull_request.head.ref}`,
              }
              : { sha: context.sha, ref: context.ref };

          await rustfmt(["-l"]).then(async (paths) =>
            paths.length === 0
              ? // No formatting required
              Promise.resolve()
              : octokit.rest.git
                .createTree({
                  ...context.repo,
                  tree: await Promise.all(
                    paths.map(async (path) => ({
                      path: path.replace(
                        `${process.env.GITHUB_WORKSPACE}/`,
                        "",
                      ),
                      mode: "100644",
                      type: "blob",
                      content: await readFile(path, "utf8"),
                    })),
                  ),
                  base_tree: head.sha,
                })
                .then(async ({ data: { sha } }) =>
                  octokit.rest.git.createCommit({
                    ...context.repo,
                    message,
                    tree: sha,
                    parents: [head.sha],
                  }),
                )
                .then(async ({ data: { sha } }) =>
                  octokit.rest.git.updateRef({
                    ...context.repo,
                    ref: head.ref.replace("refs/", ""),
                    sha,
                  }),
                ),
          );
        }
        break;
      case "review":
        {
          if (!context.payload.pull_request) {
            throw new Error(
              "Review mode requires a pull_request event trigger",
            );
          }
          // Dismiss exisiting reviews
          const reviews = await octokit.rest.pulls.listReviews({
            ...context.repo,
            pull_number: context.issue.number,
          });
          const review_id = reviews.data
            .reverse()
            .find(({ user }) => user?.id === 41898282)?.id;
          if (review_id !== undefined) {
            core.info(`Removing review: ${review_id}.`);
            // Delete outdated comments
            const review_comments = await octokit.rest.pulls.listCommentsForReview({
              ...context.repo,
              pull_number: context.issue.number,
              review_id,
            });
            await Promise.all(review_comments.data.map(({ id }) => {
              core.info(`Removing review comment: ${id}.`);
              octokit.rest.pulls.deleteReviewComment({
                ...context.repo,
                comment_id: id
              })
            }));
            // Dismiss review
            core.info(`Dismiss review: ${review_id}.`);
            await octokit.rest.pulls.dismissReview({
              ...context.repo,
              pull_number: context.issue.number,
              review_id,
              message: "Updating review",
            });
          } else {
            core.info(`No existing reviews found.`);
          }
          // Check current state
          const output = await check();
          if (output.length === 0) {
            // Approve
            await octokit.rest.pulls.createReview({
              ...context.repo,
              pull_number: context.issue.number,
              event: "APPROVE",
            });
            Promise.resolve();
          } else {
            // Request changes
            await octokit.rest.pulls.createReview({
              ...context.repo,
              pull_number: context.issue.number,
              body: `Please format your code using rustfmt`,
              event: "REQUEST_CHANGES",
              comments: output.map((result) => ({
                path: result.path.replace(
                  `${process.env.GITHUB_WORKSPACE} / `,
                  "",
                ),
                body: `\`\`\`suggestion
${result.mismatch.expected}\`\`\``,
                start_line:
                  result.mismatch.original_end_line ===
                    result.mismatch.original_begin_line
                    ? undefined
                    : result.mismatch.original_begin_line,
                line:
                  result.mismatch.original_end_line ===
                    result.mismatch.original_begin_line
                    ? result.mismatch.original_begin_line
                    : result.mismatch.original_end_line,
                side: "RIGHT",
              })),
            });
          }
        }
        break;
      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
