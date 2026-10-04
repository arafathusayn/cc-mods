import { describe, expect, test } from 'bun:test'

import { auditCatalog, describeCatalogIssue, type ModSnapshot } from '../../scripts/domain/catalog-audit'
import { encodeDocument, readDocument } from '../../scripts/domain/document'
import { decodeMarketplace, describeMarketplaceError, encodeMarketplace, listMod, type Marketplace } from '../../scripts/domain/marketplace'
import type { ModDescription } from '../../scripts/domain/mod-description'
import type { ModName } from '../../scripts/domain/mod-name'
import { addCatalogRow } from '../../scripts/domain/readme-catalog'

const CATALOG = {
  $schema: 'kept-as-read',
  name: 'cc-mods',
  owner: { name: 'A' },
  metadata: { pluginRoot: './mods' },
  plugins: [{ name: 'beta', source: 'beta', description: 'B', tags: ['kept'] }],
}

const decode = (value: unknown): Marketplace => {
  const decoded = readDocument(JSON.stringify(value), 'marketplace.json', decodeMarketplace)
  if (!decoded.ok) throw new Error(describeMarketplaceError(decoded.error))
  return decoded.value
}

const mod = (name: string, description = 'D') => ({ name: name as ModName, description: description as ModDescription })

describe('marketplace', () => {
  test('lists a mod as a bare name, sorted, keeping fields it does not model', () => {
    const listed = listMod(decode(CATALOG), mod('alpha'))
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(JSON.parse(encodeDocument(encodeMarketplace(listed.value)))).toEqual({
      ...CATALOG,
      plugins: [{ name: 'alpha', source: 'alpha', description: 'D' }, CATALOG.plugins[0]],
    })
  })

  test('refuses a second listing and a duplicate entry', () => {
    const again = listMod(decode(CATALOG), mod('beta'))
    expect(again.ok ? '' : describeMarketplaceError(again.error)).toBe('the marketplace already lists beta')

    const duplicated = readDocument(
      JSON.stringify({ ...CATALOG, plugins: [...CATALOG.plugins, ...CATALOG.plugins] }),
      'marketplace.json',
      decodeMarketplace,
    )
    expect(duplicated.ok ? '' : describeMarketplaceError(duplicated.error)).toBe(
      'marketplace.json: $.plugins[1].name must be a name no other entry uses (got "beta")',
    )
  })

  test('reports where a malformed catalog breaks', () => {
    const broken = readDocument('{"name":"x","plugins":[{"name":1}]}', 'marketplace.json', decodeMarketplace)
    expect(broken.ok ? '' : describeMarketplaceError(broken.error)).toBe(
      'marketplace.json: $.plugins[0].name must be a string (got number)',
    )
    const syntax = readDocument('{', 'marketplace.json', decodeMarketplace)
    expect(syntax.ok ? '' : describeMarketplaceError(syntax.error)).toStartWith('marketplace.json: invalid JSON')
  })
})

describe('catalog audit', () => {
  const kernel = new Map([['result.ts', 'canonical']])
  const snapshot = (folder: string, overrides: Partial<ModSnapshot> = {}): ModSnapshot => ({
    folder,
    manifest: { name: folder },
    kernelCopy: undefined,
    ...overrides,
  })
  const audit = (mods: ModSnapshot[], catalog: unknown = CATALOG) =>
    auditCatalog({ marketplace: decode(catalog), modsDir: 'mods', mods, kernel }).map(describeCatalogIssue)

  test('a listed, consistent mod passes', () => {
    expect(audit([snapshot('beta', { kernelCopy: new Map(kernel) })])).toEqual([])
  })

  test('finds every way the catalog and the folders disagree', () => {
    const catalog = {
      ...CATALOG,
      plugins: [
        { name: 'beta', source: './elsewhere/beta', description: 'B', version: '1.0.0' },
        { name: 'ghost', source: 'ghost', description: 'G' },
      ],
    }
    expect(
      audit(
        [
          snapshot('beta', { manifest: { name: 'other' }, kernelCopy: new Map([['result.ts', 'edited'], ['extra.ts', '']]) }),
          snapshot('stray'),
        ],
        catalog,
      ),
    ).toEqual([
      'mods/beta is named "other" in plugin.json; folder, manifest and entry names must agree',
      'mods/beta/hooks/kernel/ is not a copy of kernel/ (extra.ts, result.ts); run bun run sync-kernel',
      'marketplace entry beta has source "./elsewhere/beta", which is not mods/beta',
      'mods/stray is not listed in the marketplace (bun run new lists new mods)',
      'marketplace entry beta sets version; keep it in plugin.json alone',
      'the marketplace lists ghost, but no mod folder holds it',
    ])
  })
})

describe('readme catalog', () => {
  const README = '# x\n\n## Mods\n\n| Mod | What it does |\n| --- | --- |\n| _none yet_ | |\n\n## Layout\n'

  test('replaces the placeholder and keeps rows sorted and escaped', () => {
    const first = addCatalogRow(README, mod('zeta', 'a | b'))
    const second = first.ok ? addCatalogRow(first.value, mod('alpha')) : first
    expect(second.ok && second.value).toBe(
      '# x\n\n## Mods\n\n| Mod | What it does |\n| --- | --- |\n| [alpha](mods/alpha) | D |\n| [zeta](mods/zeta) | a \\| b |\n\n## Layout\n',
    )
  })

  test('refuses a README without the table', () => {
    expect(addCatalogRow('# x\n', mod('a')).ok).toBe(false)
  })
})
