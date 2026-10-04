// ProcessRunner over Bun.spawn, and the tools this repository drives on top of it.
import { join } from 'node:path'

import { attemptAsync, describeCause, map, type AsyncResult } from '../../kernel/result'
import type { ClaudeCli, ProcessOutcome, ProcessError, ProcessRunner, TypeChecker, UnitTestRunner } from '../ports'

export const bunProcessRunner: ProcessRunner = {
  run: (argv, options = {}) =>
    attemptAsync(
      async () => {
        const child = Bun.spawn([...argv], {
          ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
        })
        // Drain both pipes while the child runs, so neither fills and stalls it.
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ])
        const output = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join('\n')
        return { exitCode, output } satisfies ProcessOutcome
      },
      (cause): ProcessError => ({ kind: 'process/spawn-failed', argv, message: describeCause(cause) }),
    ),
}

export const claudeCli = (runner: ProcessRunner, binary = 'claude'): ClaudeCli => ({
  version: (): AsyncResult<string, ProcessError> =>
    runner
      .run([binary, '--version'])
      .then(result => map(result, ({ output }) => output.trim().split(/\s+/)[0] ?? 'unknown')),

  validate: (path, { strict }) => runner.run([binary, 'plugin', 'validate', ...(strict ? ['--strict'] : []), path]),

  test: modDir => runner.run([binary, 'plugin', 'test', modDir]),

  runCommand: (command, pluginDir) => runner.run([binary, '-p', `/${command}`, '--plugin-dir', pluginDir]),
})

/**
 * tsc from the repository's own node_modules (one pinned version, no resolution
 * per run), single-threaded: heavy checks take one core on a shared machine.
 */
export const tscTypeChecker = (runner: ProcessRunner, root: string): TypeChecker => ({
  check: tsconfig =>
    runner.run([join(root, 'node_modules', '.bin', 'tsc'), '--singleThreaded', '-p', tsconfig], { cwd: root }),
})

/** bun test in one process, files in sequence: no --parallel workers. */
export const bunUnitTestRunner = (runner: ProcessRunner, root: string): UnitTestRunner => ({
  run: path => runner.run([process.execPath, 'test', path], { cwd: root }),
})
