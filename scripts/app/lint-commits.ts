// Use case: hold commit messages to Conventional Commits, one message (the
// commit-msg hook) or every commit in a range (CI).
import { err, ok, type AsyncResult } from '../../kernel/result'
import { describeCommitMessageError, parseCommitMessage } from '../domain/commit-message'
import { describeProcessError, type ProcessError, type ProcessRunner } from '../ports'

export type CommitProblem = { readonly commit: string; readonly subject: string; readonly problem: string }

export type LintCommitsError = ProcessError | { readonly kind: 'lint-commits/git-failed'; readonly output: string }

/** Why the message is not conventional, or undefined when it is. */
export const lintMessage = (message: string): string | undefined => {
  const parsed = parseCommitMessage(message)
  return parsed.ok ? undefined : describeCommitMessageError(parsed.error)
}

// Unit and record separators cannot occur in a commit message.
const FIELD = '\x1f'
const RECORD = '\x1e'

/** Every commit in `range` (such as `origin/main..HEAD`) whose message is not conventional. */
export const lintRange =
  (deps: { readonly runner: ProcessRunner; readonly cwd: string }) =>
  async (range: string): AsyncResult<CommitProblem[], LintCommitsError> => {
    const log = await deps.runner.run(['git', 'log', '--no-merges', `--format=%h${FIELD}%B${RECORD}`, range], {
      cwd: deps.cwd,
    })
    if (!log.ok) return log
    if (log.value.exitCode !== 0) return err({ kind: 'lint-commits/git-failed', output: log.value.output })

    const problems: CommitProblem[] = []
    for (const record of log.value.output.split(RECORD)) {
      const [commit = '', message = ''] = record.trim().split(FIELD)
      if (commit === '') continue
      const problem = lintMessage(message)
      if (problem !== undefined) problems.push({ commit, subject: message.split('\n')[0] ?? '', problem })
    }
    return ok(problems)
  }

export const describeLintCommitsError = (error: LintCommitsError): string =>
  error.kind === 'process/spawn-failed' ? describeProcessError(error) : `git log failed:\n${error.output}`
