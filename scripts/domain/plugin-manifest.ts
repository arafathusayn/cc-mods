// A mod's .claude-plugin/plugin.json.
import { object, optional, string, type Decoded } from '../../kernel/decode'
import type { JsonObject } from './document'
import type { ModDescription } from './mod-description'
import type { ModName } from './mod-name'

/** The fields this repository reads; the rest of the manifest is Claude Code's business. */
export const decodePluginManifest = object({ name: string, version: optional(string) })
export type PluginManifest = Decoded<typeof decodePluginManifest>

export type Author = { readonly name: string; readonly url: string }

export const newPluginManifest = (input: {
  readonly name: ModName
  readonly description: ModDescription
  readonly author: Author
  readonly repositoryUrl: string
  readonly license: string
}): JsonObject => ({
  name: input.name,
  version: '0.1.0',
  description: input.description,
  author: { name: input.author.name, url: input.author.url },
  repository: input.repositoryUrl,
  license: input.license,
})
