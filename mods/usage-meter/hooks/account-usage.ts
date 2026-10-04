// The boundary where the account's usage (what `/usage` reads from the API)
// becomes Readings of the weekly windows that count one model alone. The API
// responses carry only the 5-hour and the all-models week; this is the one
// place a model's own week, such as Fable's, is reported.
//
// The endpoint is the one Claude Code itself reads, not a published API, so
// every entry is decoded strictly and one that does not decode is left out.
import type { Reading } from '../types'
import { array, describeDecodeError, isPlainObject, literal, nullable, number, object, optional, refine, string, unknown, type DecodeError } from './kernel/decode'
import { attempt, err, ok, partition, type Result } from './kernel/result'
import { modelWeekKind } from './limit-window'
import { isoTime } from './reading'

/** Where Claude Code reads the account's usage; a first-party host, so the session's credential rides. */
export const ACCOUNT_USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'

const decodeModelWeek = object({
  kind: literal('weekly_scoped'),
  percent: refine(number, percent => percent >= 0, 'a percent of 0 or more'),
  resets_at: optional(nullable(isoTime)),
  scope: object({
    model: object({ display_name: refine(string, name => name.trim().length > 0, 'a model name') }),
  }),
})

const decodeBody = object({ limits: array(unknown) })

/** A weekly window scoped to a model: the entries this decoder is for; the rest are someone else's. */
const isModelWeek = (entry: unknown): boolean =>
  isPlainObject(entry) && entry.kind === 'weekly_scoped' && isPlainObject(entry.scope) && entry.scope.model != null

export type AccountUsageError =
  | { readonly kind: 'account-usage/not-json'; readonly cause: string }
  | DecodeError

export const describeAccountUsageError = (error: AccountUsageError): string => {
  switch (error.kind) {
    case 'account-usage/not-json':
      return `not JSON (${error.cause})`
    case 'decode/invalid':
      return describeDecodeError(error)
  }
}

export type ModelWeeks = {
  readonly readings: readonly Reading[]
  /** Model weeks that did not decode, each left out; for the debug log. */
  readonly refused: readonly DecodeError[]
}

/** The model weeks in the endpoint's answer; an answer of another shape is an error. */
export const decodeModelWeeks = (body: string): Result<ModelWeeks, AccountUsageError> => {
  const parsed = attempt(
    () => JSON.parse(body) as unknown,
    cause => ({ kind: 'account-usage/not-json' as const, cause: String(cause) }),
  )
  if (!parsed.ok) return parsed
  const decoded = decodeBody(parsed.value)
  if (!decoded.ok) return err(decoded.error)
  const { values, errors } = partition(
    decoded.value.limits.filter(isModelWeek).map(entry => {
      const week = decodeModelWeek(entry)
      if (!week.ok) return week
      const { percent, resets_at: resetsAtMs, scope } = week.value
      const kind = modelWeekKind(scope.model.display_name.trim())
      return ok<Reading>(resetsAtMs == null ? { kind, percentUsed: percent } : { kind, percentUsed: percent, resetsAtMs })
    }),
  )
  return ok({ readings: values, refused: errors })
}
