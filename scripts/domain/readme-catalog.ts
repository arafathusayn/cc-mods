// The README's mods section: one section per mod, its name linking to the
// mod's own README, its description and its install guide. It is rendered from
// the catalog, between two markers, so it never says what the catalog does not;
// nothing in it is edited by hand. Pure.
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

const NO_DESCRIPTION = '_No description in the catalog._'

/** A catalog line read as a sentence: a full stop added when it ends without one. */
const sentenceOf = (line: string): string => (/[.!?_)]$/.test(line) ? line : `${line}.`)

const guideFor = (source: ReadmeSource, name: string, description: string): string => {
  const plugin = `${name}@${source.marketplace.name}`
  return [
    `### [${name}](${source.modsDirName}/${name}/README.md)`,
    '',
    sentenceOf(description),
    '',
    '```bash',
    `claude plugin marketplace add ${source.repository}`,
    `claude plugin install ${plugin}`,
    '```',
    '',
    `Then \`/reload-plugins\` in an open session. Update: \`claude plugin update ${plugin}\`.`,
    `Remove: \`claude plugin uninstall ${plugin}\`.`,
  ].join('\n')
}

/** The section between the markers, markers included: a guide per mod, by name. */
export const renderModsSection = (source: ReadmeSource): string => {
  const guides = [...source.marketplace.entries]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map(entry => guideFor(source, entry.name, entry.description?.trim() || NO_DESCRIPTION))
  const body = guides.length === 0 ? '_No mods yet._' : guides.join('\n\n')
  return [MODS_START, '', body, '', MODS_END].join('\n')
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
