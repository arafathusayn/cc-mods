#!/usr/bin/env bun
// bun run check [mod...]: every check CI runs, or only the named mods' own checks plus the shared ones.
import { describeCheckRepoError, planChecks, runChecks, type CheckResult } from '../app/check-repo'
import { exitWith, wire } from './wiring'

const indent = (text: string): string =>
  text
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n')

const print = (result: CheckResult): void => {
  console.log(`${result.isPassed ? '✔' : '✘'} ${result.title}`)
  // Passing checks stay one line; a failure shows everything the tool said.
  if (!result.isPassed && result.detail !== '') console.log(indent(result.detail))
}

const deps = wire()
const checks = await planChecks(deps)(Bun.argv.slice(2))
if (!checks.ok) exitWith(describeCheckRepoError(checks.error))
else {
  const started = performance.now()
  const results = await runChecks(deps, checks.value, print)
  const failed = results.filter(result => !result.isPassed).length
  const seconds = ((performance.now() - started) / 1000).toFixed(1)
  if (failed > 0) exitWith(`${failed} of ${results.length} checks failed (${seconds}s)`)
  console.log(`\n✔ ${results.length} checks passed (${seconds}s)`)
}
