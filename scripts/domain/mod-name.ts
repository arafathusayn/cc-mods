// A mod's name: its folder under mods/, its plugin.json name, its marketplace
// entry name and the id people install it by (<name>@<marketplace>).
import { err, ok, type Result } from '../../kernel/result'

declare const modNameBrand: unique symbol
export type ModName = string & { readonly [modNameBrand]: true }

export type ModNameError = { readonly kind: 'mod-name/invalid'; readonly name: string; readonly reason: string }

const MAX_LENGTH = 64
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Prefixes and names `claude plugin validate` rejects as Anthropic's own.
const RESERVED_PREFIX = /^(?:claude|anthropic|anthropics|cc-plugin)-/
const RESERVED_NAMES: ReadonlySet<string> = new Set([
  'claude',
  'anthropic',
  'anthropics',
  'claude-code',
  'claude-mods',
  // Folders under mods/ that hold shared files, not a mod.
  'types',
])

const invalid = (name: string, reason: string): ModNameError => ({ kind: 'mod-name/invalid', name, reason })

export const parseModName = (raw: string): Result<ModName, ModNameError> => {
  if (raw.length === 0) return err(invalid(raw, 'is empty'))
  if (raw.length > MAX_LENGTH) return err(invalid(raw, `is longer than ${MAX_LENGTH} characters`))
  if (!KEBAB_CASE.test(raw)) return err(invalid(raw, 'must be kebab-case: a-z, 0-9, single hyphens between words'))
  if (RESERVED_PREFIX.test(raw) || RESERVED_NAMES.has(raw)) return err(invalid(raw, 'is reserved'))
  return ok(raw as ModName)
}

export const describeModNameError = (error: ModNameError): string =>
  `mod name "${error.name}" ${error.reason}`
