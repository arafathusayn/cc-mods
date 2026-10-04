// The README's mods section: an index of every mod and, under it, each mod's
// install guide. It is rendered from the catalog, between two markers, so it
// never says what the catalog does not; nothing in it is edited by hand. Pure.
import { err, ok, type Result } from '../../kernel/result'
import type { Marketplace } from './marketplace'

export const MODS_START =
  '<!-- mods:start: rendered from .claude-plugin/marketplace.json by `bun run sync-readme`; edit the catalog, not this -->'
export const MODS_END = '<!-- mods:end -->'

export type ReadmeCatalogError = { readonly kind: 'readme/no-mods-section'; readonly start: string; readonly end: string }

export type ReadmeSource = {
  readonly marketplace: Marketplace
  /** `owner/repo`, as `claude plugin marketplace add` takes it. */
  readonly repository: string
  /** The folder the mods live in, as links from the README spell it. */
  readonly modsDirName: string
}

const escapeCell = (text: string): string => text.replaceAll('\\', '\\\\').replaceAll('|', '\\|')

const NO_DESCRIPTION = '_No description in the catalog._'

/** A catalog line read as a sentence: a full stop added when it ends without one. */
const sentenceOf = (line: string): string => (/[.!?_)]$/.test(line) ? line : `${line}.`)

const guideFor = (source: ReadmeSource, name: string, description: string): string => {
  const plugin = `${name}@${source.marketplace.name}`
  return [
    `### ${name}`,
    '',
    sentenceOf(description),
    '',
    '```bash',
    `claude plugin marketplace add ${source.repository}`,
    `claude plugin install ${plugin}`,
    '```',
    '',
    `In a session that is already open, run \`/reload-plugins\`. Update with \`claude plugin update ${plugin}\`;`,
    `remove with \`claude plugin uninstall ${plugin}\`. How it works and how to use it:`,
    `[${source.modsDirName}/${name}](${source.modsDirName}/${name}/README.md).`,
  ].join('\n')
}

/** The section between the markers, markers included: the index, then a guide per mod, by name. */
export const renderModsSection = (source: ReadmeSource): string => {
  const mods = [...source.marketplace.entries]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map(entry => ({ name: entry.name, description: entry.description?.trim() || NO_DESCRIPTION }))
  if (mods.length === 0) return [MODS_START, '', '_No mods yet._', '', MODS_END].join('\n')

  const index = [
    '| Mod | What it does |',
    '| --- | --- |',
    // A kebab-case heading's anchor is the name itself.
    ...mods.map(mod => `| [${mod.name}](#${mod.name}) | ${escapeCell(mod.description)} |`),
  ]
  return [MODS_START, '', ...index, '', mods.map(mod => guideFor(source, mod.name, mod.description)).join('\n\n'), '', MODS_END].join(
    '\n',
  )
}

/** The README with its mods section replaced by `section`; everything outside the markers kept as it is. */
export const withModsSection = (readme: string, section: string): Result<string, ReadmeCatalogError> => {
  const start = readme.indexOf(MODS_START)
  const end = start === -1 ? -1 : readme.indexOf(MODS_END, start)
  if (start === -1 || end === -1) return err({ kind: 'readme/no-mods-section', start: MODS_START, end: MODS_END })
  return ok(readme.slice(0, start) + section + readme.slice(end + MODS_END.length))
}

/** The README as the catalog says it should read. */
export const readmeFor = (readme: string, source: ReadmeSource): Result<string, ReadmeCatalogError> =>
  withModsSection(readme, renderModsSection(source))

export const describeReadmeCatalogError = (error: ReadmeCatalogError): string =>
  `README.md has no mods section: put the lines "${error.start}" and "${error.end}" where it goes`
