#!/usr/bin/env bun
// Conventional Commits, enforced.
//   bun scripts/cli/lint-commits.ts --file <path>    one message (the commit-msg hook)
//   bun scripts/cli/lint-commits.ts --range <a..b>   every commit in a range (CI)
import { describeLintCommitsError, lintMessage, lintRange } from '../app/lint-commits'
import { COMMIT_TYPES } from '../domain/commit-message'
import { exitWith, wire } from './wiring'

const HINT = `expected "<type>(<scope>): <subject>", type one of ${COMMIT_TYPES.join(', ')}; e.g. "feat(token-meter): show cache hits"`

const [mode, value, ...extra] = Bun.argv.slice(2)

if (mode === '--file' && value !== undefined && extra.length === 0) {
  const problem = lintMessage(await Bun.file(value).text())
  if (problem !== undefined) exitWith(`${problem}\n  ${HINT}`)
} else if (mode === '--range' && value !== undefined && extra.length === 0) {
  const deps = wire()
  const problems = await lintRange({ runner: deps.runner, cwd: deps.layout.root })(value)
  if (!problems.ok) exitWith(describeLintCommitsError(problems.error))
  else if (problems.value.length > 0) {
    for (const { commit, subject, problem } of problems.value) console.error(`✘ ${commit} ${subject}\n    ${problem}`)
    exitWith(`${problems.value.length} commit(s) are not conventional\n  ${HINT}`)
  } else console.log(`✔ every commit in ${value} is conventional`)
} else {
  exitWith('usage: lint-commits.ts --file <path> | --range <a..b>', 2)
}
