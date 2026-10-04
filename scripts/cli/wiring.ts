// The composition root: the one place adapters meet use cases.
import { availableParallelism } from 'node:os'

import { describeDecodeError, literal, oneOf, optional, refine, string, transform } from '../../kernel/decode'
import { ok } from '../../kernel/result'
import { bunFileReader, bunFileWriter } from '../adapters/bun-files'
import { bunProcessRunner, bunUnitTestRunner, claudeCli, tscTypeChecker } from '../adapters/bun-processes'
import { PUBLISHER, repositoryLayout } from '../config'
import { DEFAULT_LOAD_PERCENT } from '../domain/machine-load'

/** Prints to stderr and exits non-zero. */
export const exitWith = (message: string, code = 1): never => {
  console.error(`✘ ${message}`)
  process.exit(code)
}

// Checks run one at a time unless CC_MODS_CHECK_CONCURRENCY says otherwise
// (CI, a dedicated runner). Decoded once, at the boundary: `auto` is the
// host's core count; a number is a request that the core count caps.
const CONCURRENCY_VARIABLE = 'CC_MODS_CHECK_CONCURRENCY'
const CORES = availableParallelism()
const POSITIVE_INTEGER = /^[1-9][0-9]*$/
const positiveInteger = transform(refine(string, text => POSITIVE_INTEGER.test(text), 'a positive integer'), text => ok(Number(text)))
const decodeConcurrency = optional(
  oneOf(
    '"auto" or a positive integer',
    transform(literal('auto'), () => ok(CORES)),
    positiveInteger,
  ),
)

// The load gate waits while the 1-minute load is at or above this share of the
// cores, in whole percent; CC_MODS_GATE_LOAD_PERCENT sets it for one run or a
// machine. Unset or empty, it is DEFAULT_LOAD_PERCENT.
const LOAD_PERCENT_VARIABLE = 'CC_MODS_GATE_LOAD_PERCENT'
const decodeLoadPercent = optional(positiveInteger)

export const gateLoadPercent = (): number => {
  const raw = process.env[LOAD_PERCENT_VARIABLE]
  const decoded = decodeLoadPercent(raw === '' ? undefined : raw)
  if (!decoded.ok) return exitWith(`${LOAD_PERCENT_VARIABLE}: ${describeDecodeError(decoded.error)}`, 2)
  return decoded.value ?? DEFAULT_LOAD_PERCENT
}

const checkConcurrency = (): number => {
  const raw = process.env[CONCURRENCY_VARIABLE]
  const decoded = decodeConcurrency(raw === '' ? undefined : raw)
  if (!decoded.ok) return exitWith(`${CONCURRENCY_VARIABLE}: ${describeDecodeError(decoded.error)}`, 2)
  return Math.min(decoded.value ?? 1, CORES)
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
