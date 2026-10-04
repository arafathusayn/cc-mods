// The one line shown beside a mod in /plugin, the marketplace and the README.
import { err, ok, type Result } from '../../kernel/result'

declare const modDescriptionBrand: unique symbol
export type ModDescription = string & { readonly [modDescriptionBrand]: true }

export type ModDescriptionError = { readonly kind: 'mod-description/invalid'; readonly reason: string }

const MAX_LENGTH = 200

const invalid = (reason: string): ModDescriptionError => ({ kind: 'mod-description/invalid', reason })

export const parseModDescription = (raw: string): Result<ModDescription, ModDescriptionError> => {
  const text = raw.trim()
  if (text.length === 0) return err(invalid('is empty'))
  if (/[\r\n]/.test(text)) return err(invalid('must be one line'))
  if (text.length > MAX_LENGTH) return err(invalid(`is longer than ${MAX_LENGTH} characters`))
  return ok(text as ModDescription)
}

export const describeModDescriptionError = (error: ModDescriptionError): string =>
  `description ${error.reason}`
