// Use case: every check CI runs. The checks are independent, so they run
// concurrently; results are reported in plan order as they become final.
import { join } from 'node:path'

import { all, err, ok, type AsyncResult, type Result } from '../../kernel/result'
import type { Layout } from '../config'
import { auditCatalog, describeCatalogIssue, type ModSnapshot } from '../domain/catalog-audit'
import { describeDocumentError, readDocument } from '../domain/document'
import { decodeMarketplace, type Marketplace } from '../domain/marketplace'
import { decodePluginManifest } from '../domain/plugin-manifest'
import {
  describeIoError,
  describeProcessError,
  type ClaudeCli,
  type FileReader,
  type IoError,
  type ProcessError,
  type ProcessOutcome,
  type TypeChecker,
  type UnitTestRunner,
} from '../ports'
import { runOrdered } from '../support/ordered-pool'
import { readKernel, readModKernel } from './kernel-files'
import { discoverMods } from './mod-discovery'

export type CheckRepoDeps = {
  readonly reader: FileReader
  readonly claude: Pick<ClaudeCli, 'validate' | 'test'>
  readonly typeChecker: TypeChecker
  readonly unitTests: UnitTestRunner
  readonly layout: Layout
  readonly concurrency: number
}

export type CheckResult = { readonly title: string; readonly isPassed: boolean; readonly detail: string }

export type CheckRepoError =
  | IoError
  | { readonly kind: 'check/unknown-mod'; readonly name: string }

type Check = { readonly title: string; readonly run: () => Promise<CheckResult> }

const fromProcess = (title: string, outcome: Result<ProcessOutcome, ProcessError>): CheckResult =>
  outcome.ok
    ? { title, isPassed: outcome.value.exitCode === 0, detail: outcome.value.output }
    : { title, isPassed: false, detail: describeProcessError(outcome.error) }

const readMarketplace = async (reader: FileReader, layout: Layout): AsyncResult<Marketplace, string> => {
  const text = await reader.readText(layout.marketplaceFile)
  if (!text.ok) return err(describeIoError(text.error))
  const marketplace = readDocument(text.value, layout.marketplaceFile, decodeMarketplace)
  return marketplace.ok ? marketplace : err(describeDocumentError(marketplace.error))
}

const snapshotMod = async (reader: FileReader, layout: Layout, folder: string): AsyncResult<ModSnapshot, string> => {
  const dir = join(layout.modsDir, folder)
  const manifestPath = join(dir, '.claude-plugin', 'plugin.json')
  const [manifestText, kernelCopy] = await Promise.all([
    reader.readText(manifestPath),
    readModKernel(reader, dir),
  ])
  if (!manifestText.ok) return err(describeIoError(manifestText.error))
  if (!kernelCopy.ok) return err(describeIoError(kernelCopy.error))
  const manifest = readDocument(manifestText.value, manifestPath, decodePluginManifest)
  if (!manifest.ok) return err(describeDocumentError(manifest.error))
  return ok({ folder, manifest: manifest.value, kernelCopy: kernelCopy.value })
}

const catalogCheck = (deps: CheckRepoDeps, folders: readonly string[]): Check => ({
  title: 'catalog: folders, manifests and marketplace entries agree',
  run: async () => {
    const title = 'catalog: folders, manifests and marketplace entries agree'
    const { reader, layout } = deps
    const [marketplace, kernel, snapshots] = await Promise.all([
      readMarketplace(reader, layout),
      readKernel(reader, layout),
      Promise.all(folders.map(folder => snapshotMod(reader, layout, folder))),
    ])
    if (!marketplace.ok) return { title, isPassed: false, detail: marketplace.error }
    if (!kernel.ok) return { title, isPassed: false, detail: describeIoError(kernel.error) }
    const mods = all(snapshots)
    if (!mods.ok) return { title, isPassed: false, detail: mods.error }

    const issues = auditCatalog({
      marketplace: marketplace.value,
      modsDir: layout.modsDirName,
      mods: mods.value,
      kernel: kernel.value,
    })
    return {
      title,
      isPassed: issues.length === 0,
      detail: issues.length === 0 ? `${mods.value.length} mod(s) listed` : issues.map(describeCatalogIssue).join('\n'),
    }
  },
})

const marketplaceCheck = (deps: CheckRepoDeps, modCount: number): Check => ({
  title: 'marketplace: claude plugin validate',
  // An empty catalog only warns, which --strict would turn into a failure.
  run: async () =>
    fromProcess('marketplace: claude plugin validate', await deps.claude.validate(deps.layout.root, { strict: modCount > 0 })),
})

const modCheck = (deps: CheckRepoDeps, folder: string): Check => {
  const title = `${folder}: validate --strict, plugin tests`
  return {
    title,
    run: async () => {
      const dir = join(deps.layout.modsDir, folder)
      const [validated, tests] = await Promise.all([
        deps.claude.validate(dir, { strict: true }),
        deps.reader.glob('**/*.test.{ts,tsx}', dir),
      ])
      const validation = fromProcess(title, validated)
      if (!tests.ok) return { title, isPassed: false, detail: describeIoError(tests.error) }
      if (tests.value.length === 0) {
        return { title, isPassed: false, detail: `${validation.detail}\nmods/${folder} has no tests (tests/*.test.ts)` }
      }
      const tested = fromProcess(title, await deps.claude.test(dir))
      return {
        title,
        isPassed: validation.isPassed && tested.isPassed,
        detail: [validation.detail, tested.detail].filter(Boolean).join('\n'),
      }
    },
  }
}

const modTypesCheck = (deps: CheckRepoDeps): Check => ({
  title: 'mods: tsc',
  run: async () => {
    const title = 'mods: tsc'
    if (!(await deps.reader.exists(join(deps.layout.sharedTypesDir, 'claude-code')))) {
      return { title, isPassed: false, detail: 'mods/types/claude-code is missing; run bun run sync-types' }
    }
    return fromProcess(title, await deps.typeChecker.check(deps.layout.modsTsconfig))
  },
})

const scriptChecks = (deps: CheckRepoDeps): Check[] => [
  {
    title: 'scripts: bun test',
    run: async () => fromProcess('scripts: bun test', await deps.unitTests.run(deps.layout.unitTestsDir)),
  },
  {
    title: 'scripts: tsc',
    run: async () => fromProcess('scripts: tsc', await deps.typeChecker.check(deps.layout.scriptsTsconfig)),
  },
]

/** The checks to run: every mod, or only `selected`, which must name mod folders. */
export const planChecks =
  (deps: CheckRepoDeps) =>
  async (selected: readonly string[]): AsyncResult<Check[], CheckRepoError> => {
    const discovered = await discoverMods(deps.reader, deps.layout)
    if (!discovered.ok) return discovered
    const folders = discovered.value
    const unknown = selected.find(name => !folders.includes(name))
    if (unknown !== undefined) return err({ kind: 'check/unknown-mod', name: unknown })
    const mods = selected.length > 0 ? selected : folders

    return ok([
      catalogCheck(deps, folders),
      marketplaceCheck(deps, folders.length),
      ...mods.map(folder => modCheck(deps, folder)),
      ...(folders.length > 0 ? [modTypesCheck(deps)] : []),
      ...scriptChecks(deps),
    ])
  }

export const runChecks = (
  deps: Pick<CheckRepoDeps, 'concurrency'>,
  checks: readonly Check[],
  onResult: (result: CheckResult) => void,
): Promise<CheckResult[]> =>
  runOrdered(
    checks.map(check => check.run),
    deps.concurrency,
    result => onResult(result),
  )

export const describeCheckRepoError = (error: CheckRepoError): string => {
  switch (error.kind) {
    case 'check/unknown-mod':
      return `no mod named ${error.name} under mods/`
    case 'io/failed':
      return describeIoError(error)
  }
}
