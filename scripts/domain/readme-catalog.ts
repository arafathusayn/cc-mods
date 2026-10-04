// The README's mods section: one section per mod, its name, its description,
// its install guide, a link to the mod's own README and, folded away, the
// update and remove commands. It is rendered from
// the catalog under the `## Mods` heading, up to the next `## ` heading, so it
// never says what the catalog does not; nothing in it is edited by hand. Pure.
import { err, ok, type Result } from '../../kernel/result'
import type { Marketplace } from './marketplace'

/** The heading the mods section sits under; the section runs to the next level-2 heading. */
export const MODS_HEADING = '## Mods'

export type ReadmeCatalogError = { readonly kind: 'readme/no-mods-section'; readonly heading: string }

export type ReadmeSource = {
  readonly marketplace: Marketplace
  /** `owner/repo`, as `claude plugin marketplace add` takes it. */
  readonly repository: string
  /** The folder the mods live in, as links from the README spell it. */
  readonly modsDirName: string
}

const NO_DESCRIPTION = '_No description in the catalog._'

/**
 * A catalog line read as a sentence: a full stop added when it ends without
 * one, a leading `#` escaped so the line can never read as a heading.
 */
const sentenceOf = (line: string): string => (/[.!?_)]$/.test(line) ? line : `${line}.`).replace(/^#/, '\\#')

/** A slash command standing alone in plain text, as `/usage-meter` in "/usage-meter opens a pane". */
const SLASH_COMMAND = /(^|[\s(])(\/[a-z][a-z0-9-]*)(?=$|[\s.,;:!?)])/g

/**
 * Slash commands set as code, so a reader sees what to type. The catalog's
 * text is plain (the plugin browser shows it as is), so a line that already
 * holds a backtick is left alone.
 */
const withCommandsAsCode = (line: string): string =>
  line.includes('`') ? line : line.replace(SLASH_COMMAND, (_, before: string, command: string) => `${before}\`${command}\``)

const guideFor = (source: ReadmeSource, name: string, description: string): string => {
  const plugin = `${name}@${source.marketplace.name}`
  return [
    `### ${name}`,
    '',
    withCommandsAsCode(sentenceOf(description)),
    '',
    '```bash',
    `claude plugin marketplace add ${source.repository}`,
    `claude plugin install ${plugin}`,
    '```',
    '',
    `Then run \`/reload-plugins\` in any open session. [Read the ${name} guide](${source.modsDirName}/${name}/README.md).`,
    '',
    '<details>',
    '<summary>Update or remove</summary>',
    '',
    '```bash',
    `claude plugin update ${plugin}`,
    `claude plugin uninstall ${plugin}`,
    '```',
    '',
    '</details>',
  ].join('\n')
}

/** The section, its heading included: a guide per mod, by name. */
export const renderModsSection = (source: ReadmeSource): string => {
  const guides = [...source.marketplace.entries]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map(entry => guideFor(source, entry.name, entry.description?.trim() || NO_DESCRIPTION))
  return [MODS_HEADING, '', guides.length === 0 ? '_No mods yet._' : guides.join('\n\n')].join('\n')
}

const FENCE = /^\s*(```|~~~)/

/** Where the section that starts at `start` ends: the next level-2 heading outside a code fence, or the end. */
const sectionEnd = (lines: readonly string[], start: number): number => {
  let isFenced = false
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] as string
    if (FENCE.test(line)) isFenced = !isFenced
    else if (!isFenced && line.startsWith('## ')) return index
  }
  return lines.length
}

/**
 * The README with its mods section (the `## Mods` heading up to the next
 * level-2 heading) replaced by `section`, one blank line after it; everything
 * else kept as it is.
 */
export const withModsSection = (readme: string, section: string): Result<string, ReadmeCatalogError> => {
  const lines = readme.split('\n')
  const start = lines.indexOf(MODS_HEADING)
  if (start === -1) return err({ kind: 'readme/no-mods-section', heading: MODS_HEADING })
  const rest = lines.slice(sectionEnd(lines, start))
  return ok([...lines.slice(0, start), ...section.split('\n'), '', ...rest].join('\n'))
}

/** The README as the catalog says it should read. */
export const readmeFor = (readme: string, source: ReadmeSource): Result<string, ReadmeCatalogError> =>
  withModsSection(readme, renderModsSection(source))

export const describeReadmeCatalogError = (error: ReadmeCatalogError): string =>
  `README.md has no mods section: add a "${error.heading}" heading where the mods go`
