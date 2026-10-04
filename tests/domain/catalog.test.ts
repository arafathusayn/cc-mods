import { describe, expect, test } from 'bun:test'

import { auditCatalog, describeCatalogIssue, type ModSnapshot } from '../../scripts/domain/catalog-audit'
import { encodeDocument, readDocument } from '../../scripts/domain/document'
import { decodeMarketplace, describeMarketplaceError, encodeMarketplace, listMod, type Marketplace } from '../../scripts/domain/marketplace'
import type { ModDescription } from '../../scripts/domain/mod-description'
import type { ModName } from '../../scripts/domain/mod-name'
import { readmeFor, renderModsSection, type ReadmeSource } from '../../scripts/domain/readme-catalog'

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

describe('readme mods section', () => {
  const README = '# x\n\n## Mods\n\nanything stale\n\n### old-mod\n\n## Layout\n'
  const sourceOf = (plugins: unknown[]): ReadmeSource => ({
    marketplace: decode({ ...CATALOG, plugins }),
    repository: 'owner/repo',
    modsDirName: 'mods',
  })
  const entry = (name: string, description?: string) => ({ name, source: name, ...(description === undefined ? {} : { description }) })

  test('renders one install guide per mod, by name, each description once, the rest of the README kept', () => {
    const rendered = readmeFor(README, sourceOf([entry('zeta', 'Counts things.'), entry('alpha', 'Shows things')]))
    expect(rendered.ok && rendered.value).toBe(
      [
        '# x',
        '',
        '## Mods',
        '',
        '### [alpha](mods/alpha/README.md)',
        '',
        'Shows things.',
        '',
        '```bash',
        'claude plugin marketplace add owner/repo',
        'claude plugin install alpha@cc-mods',
        '```',
        '',
        'Then `/reload-plugins` in an open session. Update: `claude plugin update alpha@cc-mods`.',
        'Remove: `claude plugin uninstall alpha@cc-mods`.',
        '',
        '### [zeta](mods/zeta/README.md)',
        '',
        'Counts things.',
        '',
        '```bash',
        'claude plugin marketplace add owner/repo',
        'claude plugin install zeta@cc-mods',
        '```',
        '',
        'Then `/reload-plugins` in an open session. Update: `claude plugin update zeta@cc-mods`.',
        'Remove: `claude plugin uninstall zeta@cc-mods`.',
        '',
        '## Layout',
        '',
      ].join('\n'),
    )
  })

  test('renders the same README again from the same catalog', () => {
    const source = sourceOf([entry('alpha', 'Shows things')])
    const once = readmeFor(README, source)
    const twice = once.ok ? readmeFor(once.value, source) : once
    expect(twice).toEqual(once)
  })

  test('runs to the end of the README when no heading follows, and past a ## inside a code block', () => {
    const fenced = '# x\n\n## Mods\n\n```md\n## not a heading\n```\n'
    expect(readmeFor(fenced, sourceOf([]))).toEqual({ ok: true, value: '# x\n\n## Mods\n\n_No mods yet._\n' })
  })

  test('says so when the catalog lists no mod, and when an entry has no description', () => {
    expect(renderModsSection(sourceOf([]))).toBe('## Mods\n\n_No mods yet._')
    expect(renderModsSection(sourceOf([entry('alpha')]))).toContain('\n_No description in the catalog._\n')
  })

  test('never lets a description read as a heading', () => {
    expect(renderModsSection(sourceOf([entry('alpha', '## Loud')]))).toContain('\n\\## Loud.\n')
  })

  test('refuses a README without the heading', () => {
    expect(readmeFor('# x\n', sourceOf([])).ok).toBe(false)
  })
})
