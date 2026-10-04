// The boundary where the engine's rate-limit windows become Readings: each is
// decoded once, its reset time parsed to milliseconds, so nothing inward checks
// them again.
import type { SessionRateLimit } from 'claude-code'

import type { Reading } from '../types'
import { number, object, optional, refine, string, transform, type DecodeError } from './kernel/decode'
import { err, ok, partition } from './kernel/result'

/** An ISO 8601 time, as milliseconds since the epoch. */
export const isoTime = transform(string, text => {
  const ms = Date.parse(text)
  return Number.isFinite(ms) ? ok(ms) : err('an ISO 8601 time')
})

const decodeWindow = object({
  kind: refine(string, kind => kind.length > 0, 'a window name'),
  percentUsed: refine(number, percent => percent >= 0, 'a percent of 0 or more'),
  resetsAt: optional(isoTime),
})

const decodeReading = transform(decodeWindow, ({ kind, percentUsed, resetsAt }) =>
  ok<Reading>(resetsAt === undefined ? { kind, percentUsed } : { kind, percentUsed, resetsAtMs: resetsAt }),
)

export type DecodedReadings = {
  readonly readings: readonly Reading[]
  /** Windows that did not decode, each left out; for the debug log. */
  readonly refused: readonly DecodeError[]
}

/** Decodes each window on its own, so one the engine got wrong costs only itself. */
export const decodeReadings = (windows: readonly SessionRateLimit[]): DecodedReadings => {
  const { values, errors } = partition(windows.map(decodeReading))
  return { readings: values, refused: errors }
}
