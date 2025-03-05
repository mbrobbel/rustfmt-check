Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core = tslib_1.__importStar(require("@actions/core"));
const github = tslib_1.__importStar(require("@actions/github"));
const check_1 = tslib_1.__importDefault(require("./check"));
const rustfmt_1 = tslib_1.__importDefault(require("./rustfmt"));
const string_argv_1 = tslib_1.__importDefault(require("string-argv"));
const path_1 = require("path");
const util_1 = require("util");
const fs_1 = require("fs");
const readFile = (0, util_1.promisify)(fs_1.readFile);
async function run() {
    try {
        const token = core.getInput('token', { required: true });
        const octokit = github.getOctokit(token);
        const context = github.context;
        const mode = core.getInput('mode');
        const rustfmt_args = (0, string_argv_1.default)(core.getInput('rustfmt-args'));
        const message = core.getInput('commit-message');
        switch (mode) {
            case 'commit':
                {
                    const head = context.eventName === 'pull_request' && context.payload.pull_request
                        ? {
                            sha: context.payload.pull_request.head.sha,
                            ref: `refs/heads/${context.payload.pull_request.head.ref}`
                        }
                        : { sha: context.sha, ref: context.ref };
                    await (0, rustfmt_1.default)(['-l'].concat(rustfmt_args)).then(async (paths) => paths.length === 0
                        ? // No formatting required
                            Promise.resolve()
                        : octokit.rest.git
                            .createTree({
                            ...context.repo,
                            tree: await Promise.all(paths.map(async (path) => ({
                                path: (0, path_1.normalize)(path.replace(`${process.env.GITHUB_WORKSPACE}/`, '')),
                                mode: '100644',
                                type: 'blob',
                                content: await readFile(path, 'utf8')
                            }))),
                            base_tree: head.sha
                        })
                            .then(async ({ data: { sha } }) => octokit.rest.git.createCommit({
                            ...context.repo,
                            message,
                            tree: sha,
                            parents: [head.sha]
                        }))
                            .then(async ({ data: { sha } }) => octokit.rest.git.updateRef({
                            ...context.repo,
                            ref: head.ref.replace('refs/', ''),
                            sha
                        })));
                }
                break;
            case 'review':
                {
                    if (!context.payload.pull_request) {
                        throw new Error('Review mode requires a pull_request event trigger');
                    }
                    // Dismiss exisiting (open) reviews
                    const reviews = await octokit.rest.pulls.listReviews({
                        ...context.repo,
                        pull_number: context.issue.number
                    });
                    const review_id = reviews.data
                        .reverse()
                        .find(({ user, state }) => user?.id === 41898282 && state === 'CHANGES_REQUESTED')?.id;
                    if (review_id !== undefined) {
                        core.debug(`Removing review: ${review_id}.`);
                        // Delete outdated comments
                        const review_comments = await octokit.rest.pulls.listCommentsForReview({
                            ...context.repo,
                            pull_number: context.issue.number,
                            review_id
                        });
                        await Promise.all(review_comments.data.map(({ id }) => {
                            core.debug(`Removing review comment: ${id}.`);
                            octokit.rest.pulls.deleteReviewComment({
                                ...context.repo,
                                comment_id: id
                            });
                        }));
                        // Dismiss review
                        core.debug(`Dismiss review: ${review_id}.`);
                        await octokit.rest.pulls.dismissReview({
                            ...context.repo,
                            pull_number: context.issue.number,
                            review_id,
                            message: 'Removing outdated review.'
                        });
                    }
                    else {
                        core.debug(`No existing reviews found.`);
                    }
                    // Check current state
                    const output = await (0, check_1.default)();
                    if (output.length === 0) {
                        // Approve
                        core.debug('Approve review');
                        await octokit.rest.pulls.createReview({
                            ...context.repo,
                            pull_number: context.issue.number,
                            event: 'APPROVE'
                        });
                        Promise.resolve();
                    }
                    else {
                        // Request changes
                        core.debug('Request changes');
                        await octokit.rest.pulls.createReview({
                            ...context.repo,
                            pull_number: context.issue.number,
                            body: `Please format your code using [rustfmt](https://github.com/rust-lang/rustfmt): \`cargo fmt\``,
                            event: 'REQUEST_CHANGES',
                            comments: output.map((result) => ({
                                path: result.path.replace(`${process.env.GITHUB_WORKSPACE}/`, ''),
                                body: `\`\`\`suggestion
${result.mismatch.expected}\`\`\``,
                                start_line: result.mismatch.original_end_line ===
                                    result.mismatch.original_begin_line
                                    ? undefined
                                    : result.mismatch.original_begin_line,
                                line: result.mismatch.original_end_line ===
                                    result.mismatch.original_begin_line
                                    ? result.mismatch.original_begin_line
                                    : result.mismatch.original_end_line,
                                side: 'RIGHT'
                            }))
                        });
                    }
                }
                break;
            case 'pull':
                // Open a pull request from a new branch with the formatted code
                {
                    const head = context.eventName === 'pull_request' && context.payload.pull_request
                        ? {
                            sha: context.payload.pull_request.head.sha,
                            ref: `refs/heads/${context.payload.pull_request.head.ref}`
                        }
                        : { sha: context.sha, ref: context.ref };
                    const ref = `refs/heads/rustfmt-${head.sha}`;
                    await (0, rustfmt_1.default)(['-l'].concat(rustfmt_args)).then(async (paths) => paths.length === 0
                        ? // No formatting required
                            Promise.resolve()
                        : octokit.rest.git
                            .createRef({
                            ...context.repo,
                            ref,
                            sha: head.sha
                        })
                            .then(async () => octokit.rest.git
                            .createTree({
                            ...context.repo,
                            tree: await Promise.all(paths.map(async (path) => ({
                                path: (0, path_1.normalize)(path.replace(`${process.env.GITHUB_WORKSPACE}/`, '')),
                                mode: '100644',
                                type: 'blob',
                                content: await readFile(path, 'utf8')
                            }))),
                            base_tree: head.sha
                        })
                            .then(async ({ data: { sha } }) => octokit.rest.git.createCommit({
                            ...context.repo,
                            message,
                            tree: sha,
                            parents: [head.sha]
                        }))
                            .then(async ({ data: { sha } }) => octokit.rest.git.updateRef({
                            ...context.repo,
                            ref: ref.replace('refs/', ''),
                            sha
                        }))
                            .then(async () => {
                            const title = `Format code using rustfmt for ${head.sha}`;
                            const body = `The code for commit \`${head.sha}\` on \`${head.ref.replace('refs/heads/', '')}\` has been formatted automatically using [rustfmt](https://github.com/rust-lang/rustfmt).
Please review the changes and merge if everything looks good.

---

Delete the \`${ref.replace('refs/heads/', '')}\` branch after merging or closing the pull request.`;
                            return octokit.rest.pulls.create({
                                ...context.repo,
                                title,
                                head: ref.replace('refs/heads/', ''),
                                base: head.ref.replace('refs/heads/', ''),
                                body
                            });
                        })));
                }
                break;
            default:
                throw new Error(`Unsupported mode: ${mode}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.setFailed(message);
    }
}
run();
//# sourceMappingURL=index.js.map
