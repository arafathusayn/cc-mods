// The composition root: the one place adapters meet use cases.
import { availableParallelism } from 'node:os'

import { bunFileReader, bunFileWriter } from '../adapters/bun-files'
import { bunProcessRunner, bunUnitTestRunner, claudeCli, tscTypeChecker } from '../adapters/bun-processes'
import { PUBLISHER, repositoryLayout } from '../config'

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
    concurrency: availableParallelism(),
  }
}

/** Prints to stderr and exits non-zero. */
export const exitWith = (message: string, code = 1): never => {
  console.error(`✘ ${message}`)
  process.exit(code)
}
