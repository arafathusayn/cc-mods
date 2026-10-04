// The outside world as the application layer needs it. Use cases depend on
// these interfaces; adapters/ implements them; cli/ wires the two together.
// Every path is absolute.
import type { AsyncResult } from '../kernel/result'
import type { MachineLoad } from './domain/machine-load'

export type IoError = {
  readonly kind: 'io/failed'
  readonly operation: string
  readonly path: string
  readonly message: string
}

export interface FileReader {
  readText(path: string): AsyncResult<string, IoError>
  /** The text, or undefined when nothing is at the path. */
  readTextIfPresent(path: string): AsyncResult<string | undefined, IoError>
  exists(path: string): Promise<boolean>
  /** Paths under `cwd` matching `pattern`, relative to `cwd`, sorted. */
  glob(pattern: string, cwd: string): AsyncResult<string[], IoError>
}

export interface FileWriter {
  /** Replaces the file in one rename: readers see the old or the new content, never a mix. */
  writeText(path: string, content: string): AsyncResult<undefined, IoError>
  /** Creates `dir` holding exactly `files` (relative paths), or nothing at all. Fails if `dir` exists. */
  createTree(dir: string, files: ReadonlyMap<string, string>): AsyncResult<undefined, IoError>
  /** Puts a copy of the `source` folder at `target`, swapped in whole once the copy is complete. */
  replaceTree(target: string, source: string): AsyncResult<undefined, IoError>
  remove(path: string): AsyncResult<undefined, IoError>
  makeTempDir(prefix: string): AsyncResult<string, IoError>
}

export type ProcessOutcome = { readonly exitCode: number; readonly output: string }

export type ProcessError = {
  readonly kind: 'process/spawn-failed'
  readonly argv: readonly string[]
  readonly message: string
}

export interface ProcessRunner {
  /** A finished process; a non-zero exit is an outcome, not an error. */
  run(argv: readonly string[], options?: { readonly cwd?: string }): AsyncResult<ProcessOutcome, ProcessError>
}

/** The Claude Code CLI, as far as this repository drives it. */
export interface ClaudeCli {
  version(): AsyncResult<string, ProcessError>
  validate(path: string, options: { readonly strict: boolean }): AsyncResult<ProcessOutcome, ProcessError>
  test(modDir: string): AsyncResult<ProcessOutcome, ProcessError>
  /** Runs `/command` headlessly with `pluginDir` loaded; a mod's command answers without a model turn. */
  runCommand(command: string, pluginDir: string): AsyncResult<ProcessOutcome, ProcessError>
}

export interface TypeChecker {
  check(tsconfig: string): AsyncResult<ProcessOutcome, ProcessError>
}

export interface UnitTestRunner {
  run(path: string): AsyncResult<ProcessOutcome, ProcessError>
}

/** How busy the machine is now; undefined where this platform cannot say. */
export interface LoadProbe {
  read(): Promise<MachineLoad | undefined>
}

export interface Clock {
  now(): number
  sleep(ms: number): Promise<void>
}

export const describeIoError =(error: IoError): string =>
  `could not ${error.operation} ${error.path}: ${error.message}`

export const describeProcessError = (error: ProcessError): string =>
  `could not run ${error.argv.join(' ')}: ${error.message}`
