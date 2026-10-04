// The README's table of mods, kept in step with the marketplace.
import { err, ok, type Result } from '../../kernel/result'
import type { ModDescription } from './mod-description'
import type { ModName } from './mod-name'

export type ReadmeCatalogError = { readonly kind: 'readme/no-catalog'; readonly header: string }

export const CATALOG_HEADER = '| Mod | What it does |'
const PLACEHOLDER = '| _none yet_ | |'

const escapeCell = (text: string): string => text.replaceAll('\\', '\\\\').replaceAll('|', '\\|')

const rowFor = (name: ModName, description: ModDescription): string =>
  `| [${name}](mods/${name}) | ${escapeCell(description)} |`

/** The README with the mod's row in the catalog table, rows sorted, the placeholder gone. */
export const addCatalogRow = (
  readme: string,
  mod: { readonly name: ModName; readonly description: ModDescription },
): Result<string, ReadmeCatalogError> => {
  const lines = readme.split('\n')
  const header = lines.indexOf(CATALOG_HEADER)
  if (header === -1) return err({ kind: 'readme/no-catalog', header: CATALOG_HEADER })

  const first = header + 2 // the header and its delimiter row
  let end = first
  while (lines[end]?.startsWith('|')) end += 1

  const linkPrefix = `| [${mod.name}](`
  const rows = lines
    .slice(first, end)
    .filter(row => row !== PLACEHOLDER && !row.startsWith(linkPrefix))
    .concat(rowFor(mod.name, mod.description))
    .sort()

  return ok([...lines.slice(0, first), ...rows, ...lines.slice(end)].join('\n'))
}

export const describeReadmeCatalogError = (error: ReadmeCatalogError): string =>
  `README.md has no catalog table (a "${error.header}" header row)`
