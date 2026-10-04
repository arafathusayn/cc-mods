// The composition root: the one place adapters meet use cases.
import { availableParallelism } from 'node:os'

import { describeDecodeError, integer, optional, refine } from '../../kernel/decode'
import { bunFileReader, bunFileWriter } from '../adapters/bun-files'
import { bunProcessRunner, bunUnitTestRunner, claudeCli, tscTypeChecker } from '../adapters/bun-processes'
import { PUBLISHER, repositoryLayout } from '../config'

/** Prints to stderr and exits non-zero. */
export const exitWith = (message: string, code = 1): never => {
  console.error(`✘ ${message}`)
  process.exit(code)
}

// Checks run one at a time unless CC_MODS_CHECK_CONCURRENCY says otherwise
// (CI, a dedicated runner). Decoded once, at the boundary.
const CONCURRENCY_VARIABLE = 'CC_MODS_CHECK_CONCURRENCY'
const decodeConcurrency = optional(
  refine(integer, n => n >= 1 && n <= availableParallelism(), `an integer from 1 to ${availableParallelism()}`),
)

const checkConcurrency = (): number => {
  const raw = process.env[CONCURRENCY_VARIABLE]
  const decoded = decodeConcurrency(raw === undefined || raw === '' ? undefined : Number(raw))
  if (!decoded.ok) return exitWith(`${CONCURRENCY_VARIABLE}: ${describeDecodeError(decoded.error)}`, 2)
  return decoded.value ?? 1
}

export const wire = () => {
  const layout = repositoryLayout()
  const runner = bunProcessRunner
  return {
    layout,
    publisher: PUBLISHER,
    reader: bunFileReader,
    writer: bunFileWriter,
    runner,
    claude: claudeCli(runner),
    typeChecker: tscTypeChecker(runner, layout.root),
    unitTests: bunUnitTestRunner(runner, layout.root),
    concurrency: checkConcurrency(),
  }
}
