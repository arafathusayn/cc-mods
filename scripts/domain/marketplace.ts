// The catalog: .claude-plugin/marketplace.json, the aggregate root for which
// mods the repository publishes. Fields the domain does not model are kept as
// read, so an edit never drops what a newer Claude Code added to the file.
import { array, object, optional, string, unknown, type DecodeError, type Decoder } from '../../kernel/decode'
import { err, ok, type Result } from '../../kernel/result'
import { describeDocumentError, type DocumentError, type JsonObject } from './document'
import type { ModDescription } from './mod-description'
import type { ModName } from './mod-name'

export type MarketplaceEntry = {
  readonly name: string
  readonly source: string
  /** Set only when the entry overrides plugin.json, which this repository forbids. */
  readonly version: string | undefined
  readonly document: JsonObject
}

export type Marketplace = {
  readonly name: string
  /** `metadata.pluginRoot` without a leading `./`; bare sources resolve under it. */
  readonly pluginRoot: string | undefined
  readonly entries: readonly MarketplaceEntry[]
  readonly document: JsonObject
}

export type MarketplaceError = DocumentError | { readonly kind: 'marketplace/already-listed'; readonly name: string }

const normalizePath = (path: string): string => path.replace(/^\.\//, '').replace(/\/+$/, '')

const catalogShape = object({
  name: string,
  metadata: optional(object({ pluginRoot: optional(string) })),
  plugins: array(unknown),
})
const entryShape = object({ name: string, source: string, version: optional(string) })

const invalidAt = (path: readonly (string | number)[], expected: string, received: string): DecodeError => ({
  kind: 'decode/invalid',
  path,
  expected,
  received,
})

/** Decodes the catalog, holding it to unique entry names. */
export const decodeMarketplace: Decoder<Marketplace> = value => {
  const catalog = catalogShape(value)
  if (!catalog.ok) return catalog

  const names = new Set<string>()
  const entries: MarketplaceEntry[] = []
  for (const [index, raw] of catalog.value.plugins.entries()) {
    const entry = entryShape(raw)
    if (!entry.ok) return err({ ...entry.error, path: ['plugins', index, ...entry.error.path] })
    if (names.has(entry.value.name)) {
      return err(invalidAt(['plugins', index, 'name'], 'a name no other entry uses', JSON.stringify(entry.value.name)))
    }
    names.add(entry.value.name)
    entries.push({
      name: entry.value.name,
      source: entry.value.source,
      version: entry.value.version,
      document: raw as JsonObject,
    })
  }

  const pluginRoot = catalog.value.metadata?.pluginRoot
  return ok({
    name: catalog.value.name,
    pluginRoot: pluginRoot === undefined ? undefined : normalizePath(pluginRoot),
    entries,
    document: value as JsonObject,
  })
}

/**
 * The folder an entry's relative `source` points at, from the marketplace root;
 * undefined for a remote source, which is no folder of this repository.
 */
export const entryFolder = (catalog: Marketplace, entry: MarketplaceEntry): string | undefined => {
  if (entry.source === '.' || entry.source.startsWith('./')) return normalizePath(entry.source)
  if (!entry.source.includes('/') && catalog.pluginRoot !== undefined) return `${catalog.pluginRoot}/${entry.source}`
  return undefined
}

const byName = (a: MarketplaceEntry, b: MarketplaceEntry): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

/** Lists a mod, as a bare name under `pluginRoot` when there is one, keeping entries sorted by name. */
export const listMod = (
  catalog: Marketplace,
  mod: { readonly name: ModName; readonly description: ModDescription },
): Result<Marketplace, MarketplaceError> => {
  if (catalog.entries.some(entry => entry.name === mod.name)) {
    return err({ kind: 'marketplace/already-listed', name: mod.name })
  }
  const source = catalog.pluginRoot === undefined ? `./mods/${mod.name}` : mod.name
  const entry: MarketplaceEntry = {
    name: mod.name,
    source,
    version: undefined,
    document: { name: mod.name, source, description: mod.description },
  }
  return ok({ ...catalog, entries: [...catalog.entries, entry].sort(byName) })
}

export const encodeMarketplace = (catalog: Marketplace): JsonObject => ({
  ...catalog.document,
  plugins: catalog.entries.map(entry => entry.document),
})

export const describeMarketplaceError = (error: MarketplaceError): string =>
  error.kind === 'marketplace/already-listed'
    ? `the marketplace already lists ${error.name}`
    : describeDocumentError(error)
