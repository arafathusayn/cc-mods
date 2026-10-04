// The invariants that tie the catalog to the mods on disk. Pure: it judges a
// snapshot, it reads nothing.
import { entryFolder, type Marketplace } from './marketplace'
import type { PluginManifest } from './plugin-manifest'

export type ModSnapshot = {
  /** The mod's folder under mods/. */
  readonly folder: string
  readonly manifest: PluginManifest
  /** The mod's hooks/kernel/ files by name, when it carries a kernel. */
  readonly kernelCopy: ReadonlyMap<string, string> | undefined
}

export type CatalogIssue =
  | { readonly kind: 'audit/unlisted-mod'; readonly folder: string }
  | { readonly kind: 'audit/missing-mod'; readonly entry: string }
  | { readonly kind: 'audit/source-mismatch'; readonly entry: string; readonly source: string; readonly expected: string }
  | { readonly kind: 'audit/name-mismatch'; readonly folder: string; readonly manifestName: string }
  | { readonly kind: 'audit/entry-version'; readonly entry: string }
  | { readonly kind: 'audit/kernel-drift'; readonly folder: string; readonly files: readonly string[] }

/** Files whose copy differs from the canonical kernel, is missing, or has no canonical counterpart. */
const kernelDrift = (kernel: ReadonlyMap<string, string>, copy: ReadonlyMap<string, string>): string[] => {
  const names = new Set([...kernel.keys(), ...copy.keys()])
  return [...names].filter(name => kernel.get(name) !== copy.get(name)).sort()
}

export const auditCatalog = (input: {
  readonly marketplace: Marketplace
  readonly modsDir: string
  readonly mods: readonly ModSnapshot[]
  /** The canonical kernel/ files by name. */
  readonly kernel: ReadonlyMap<string, string>
}): CatalogIssue[] => {
  const { marketplace, modsDir, mods, kernel } = input
  const issues: CatalogIssue[] = []
  const entries = new Map(marketplace.entries.map(entry => [entry.name, entry]))
  const folders = new Set(mods.map(mod => mod.folder))

  for (const mod of mods) {
    if (mod.manifest.name !== mod.folder) {
      issues.push({ kind: 'audit/name-mismatch', folder: mod.folder, manifestName: mod.manifest.name })
    }
    if (mod.kernelCopy !== undefined) {
      const files = kernelDrift(kernel, mod.kernelCopy)
      if (files.length > 0) issues.push({ kind: 'audit/kernel-drift', folder: mod.folder, files })
    }
    const entry = entries.get(mod.folder)
    if (entry === undefined) {
      issues.push({ kind: 'audit/unlisted-mod', folder: mod.folder })
      continue
    }
    const expected = `${modsDir}/${mod.folder}`
    if (entryFolder(marketplace, entry) !== expected) {
      issues.push({ kind: 'audit/source-mismatch', entry: entry.name, source: entry.source, expected })
    }
  }

  for (const entry of marketplace.entries) {
    if (entry.version !== undefined) issues.push({ kind: 'audit/entry-version', entry: entry.name })
    if (!folders.has(entry.name)) issues.push({ kind: 'audit/missing-mod', entry: entry.name })
  }

  return issues
}

export const describeCatalogIssue = (issue: CatalogIssue): string => {
  switch (issue.kind) {
    case 'audit/unlisted-mod':
      return `mods/${issue.folder} is not listed in the marketplace (bun run new lists new mods)`
    case 'audit/missing-mod':
      return `the marketplace lists ${issue.entry}, but no mod folder holds it`
    case 'audit/source-mismatch':
      return `marketplace entry ${issue.entry} has source "${issue.source}", which is not ${issue.expected}`
    case 'audit/name-mismatch':
      return `mods/${issue.folder} is named "${issue.manifestName}" in plugin.json; folder, manifest and entry names must agree`
    case 'audit/entry-version':
      return `marketplace entry ${issue.entry} sets version; keep it in plugin.json alone`
    case 'audit/kernel-drift':
      return `mods/${issue.folder}/hooks/kernel/ is not a copy of kernel/ (${issue.files.join(', ')}); run bun run sync-kernel`
  }
}
