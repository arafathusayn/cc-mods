// Use case: scaffold a mod and publish it in the catalog and the README.
// Every input is validated and every new document computed before the first
// write; a failed write undoes the ones before it.
import { join } from 'node:path'

import { andThen, err, ok, unit, unwrapOr, type AsyncResult, type Result } from '../../kernel/result'
import type { Layout, Publisher } from '../config'
import { encodeDocument, readDocument } from '../domain/document'
import { decodeMarketplace, describeMarketplaceError, encodeMarketplace, listMod, type MarketplaceError } from '../domain/marketplace'
import { describeModDescriptionError, parseModDescription, type ModDescriptionError } from '../domain/mod-description'
import { describeModNameError, parseModName, type ModName, type ModNameError } from '../domain/mod-name'
import { scaffoldMod } from '../domain/mod-scaffold'
import { addCatalogRow, describeReadmeCatalogError, type ReadmeCatalogError } from '../domain/readme-catalog'
import { describeIoError, type ClaudeCli, type FileReader, type FileWriter, type IoError } from '../ports'
import { readKernel } from './kernel-files'

export type CreateModDeps = {
  readonly reader: FileReader
  readonly writer: FileWriter
  readonly claude: Pick<ClaudeCli, 'version'>
  readonly layout: Layout
  readonly publisher: Publisher
}

export type CreateModInput = { readonly name: string; readonly description: string }
export type CreatedMod = { readonly name: ModName; readonly dir: string; readonly files: readonly string[] }

export type CreateModError =
  | ModNameError
  | ModDescriptionError
  | MarketplaceError
  | ReadmeCatalogError
  | IoError
  | { readonly kind: 'create-mod/exists'; readonly dir: string }

type Plan = {
  readonly name: ModName
  readonly dir: string
  readonly files: ReadonlyMap<string, string>
  readonly marketplace: { readonly before: string; readonly after: string }
  readonly readme: string
}

const plan = async (deps: CreateModDeps, input: CreateModInput): AsyncResult<Plan, CreateModError> => {
  const { reader, claude, layout, publisher } = deps

  const name = parseModName(input.name)
  if (!name.ok) return name
  const description = parseModDescription(input.description)
  if (!description.ok) return description
  const mod = { name: name.value, description: description.value }
  const dir = join(layout.modsDir, mod.name)

  const [marketplaceText, readmeText, kernel, isTaken, version] = await Promise.all([
    reader.readText(layout.marketplaceFile),
    reader.readText(layout.readme),
    readKernel(reader, layout),
    reader.exists(dir),
    claude.version(),
  ])
  if (isTaken) return err({ kind: 'create-mod/exists', dir })
  if (!marketplaceText.ok) return marketplaceText
  if (!readmeText.ok) return readmeText
  if (!kernel.ok) return kernel

  const marketplace = andThen(readDocument(marketplaceText.value, layout.marketplaceFile, decodeMarketplace), catalog =>
    listMod(catalog, mod),
  )
  if (!marketplace.ok) return marketplace
  const readme = addCatalogRow(readmeText.value, mod)
  if (!readme.ok) return readme

  const files = scaffoldMod({
    ...mod,
    ...publisher,
    marketplaceName: marketplace.value.name,
    kernel: kernel.value,
    claudeVersion: unwrapOr(version, 'unknown'),
  })

  return ok({
    name: mod.name,
    dir,
    files,
    marketplace: { before: marketplaceText.value, after: encodeDocument(encodeMarketplace(marketplace.value)) },
    readme: readme.value,
  })
}

const apply = async (deps: CreateModDeps, planned: Plan): AsyncResult<undefined, IoError> => {
  const { writer, layout } = deps

  const tree = await writer.createTree(planned.dir, planned.files)
  if (!tree.ok) return tree

  const marketplace = await writer.writeText(layout.marketplaceFile, planned.marketplace.after)
  if (!marketplace.ok) {
    await writer.remove(planned.dir)
    return marketplace
  }

  const readme = await writer.writeText(layout.readme, planned.readme)
  if (!readme.ok) {
    await writer.writeText(layout.marketplaceFile, planned.marketplace.before)
    await writer.remove(planned.dir)
    return readme
  }

  return unit
}

export const createMod =
  (deps: CreateModDeps) =>
  async (input: CreateModInput): AsyncResult<CreatedMod, CreateModError> => {
    const planned = await plan(deps, input)
    if (!planned.ok) return planned
    const applied: Result<undefined, IoError> = await apply(deps, planned.value)
    if (!applied.ok) return applied
    return ok({ name: planned.value.name, dir: planned.value.dir, files: [...planned.value.files.keys()] })
  }

export const describeCreateModError = (error: CreateModError): string => {
  switch (error.kind) {
    case 'create-mod/exists':
      return `${error.dir} already exists`
    case 'mod-name/invalid':
      return describeModNameError(error)
    case 'mod-description/invalid':
      return describeModDescriptionError(error)
    case 'readme/no-catalog':
      return describeReadmeCatalogError(error)
    case 'io/failed':
      return describeIoError(error)
    default:
      return describeMarketplaceError(error)
  }
}
