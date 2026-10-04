// The ports the use cases reach the engine through, and the shape the tracks
// are stored in. Every `$` call lives in register.tsx (the engine follows `$`
// into no other file): it builds these ports, each wrapping its call once so a
// rejection comes back as a Result. Pure.
import type { SessionRateLimit } from 'claude-code'

import type { Meter, Track } from '../types'
import { describeDecodeError, literal, object, record, type DecodeError } from './kernel/decode'
import { describeCause, ok, type AsyncResult, type Result } from './kernel/result'
import { decodeTrack } from './track'

export type EngineError = {
  readonly kind: 'engine/call-failed'
  readonly call: string
  readonly cause: string
}

/** The error of a `$` call that rejected, for `attemptAsync`'s error track. */
export const failed =
  (call: string) =>
  (cause: unknown): EngineError => ({ kind: 'engine/call-failed', call, cause: describeCause(cause) })

/** Why the stored tracks could not be read back. */
export type StoreReadError = EngineError | DecodeError

export const describeFailure = (error: StoreReadError): string => {
  switch (error.kind) {
    case 'engine/call-failed':
      return `${error.call} failed: ${error.cause}`
    case 'decode/invalid':
      return `the stored tracks were set aside: ${describeDecodeError(error)}`
  }
}

export type MeterPorts = {
  /** The Meter as it stands. */
  readonly readMeter: () => AsyncResult<Meter, EngineError>
  /** Applies a pure step to the Meter (again on a concurrent write) and answers the new Meter. */
  readonly updateMeter: (step: (meter: Meter) => Meter) => AsyncResult<Meter, EngineError>
  readonly now: () => AsyncResult<number, EngineError>
  /** The windows the latest API response reported. */
  readonly rateLimits: () => AsyncResult<readonly SessionRateLimit[], EngineError>
  /** What the store holds for the tracks, undecoded; undefined when nothing is stored. */
  readonly loadStored: () => AsyncResult<unknown, EngineError>
  readonly saveStored: (stored: StoredTracks) => AsyncResult<void, EngineError>
  readonly registerCommand: () => AsyncResult<void, EngineError>
  readonly isPaneOpen: () => AsyncResult<boolean, EngineError>
  /** Opens the pane `rows` tall; answers whether it is drawn now. */
  readonly openPane: (rows: number) => AsyncResult<boolean, EngineError>
  readonly closePane: () => AsyncResult<void, EngineError>
  /** A line for the debug log. */
  readonly debug: (line: string) => void
}

// The tracks persist in $.store so a restart inside a window keeps its pace.
// The version names the shape; a stored value of another shape is set aside.
const STORE_VERSION = 1

export type StoredTracks = {
  readonly version: typeof STORE_VERSION
  readonly tracks: Readonly<Record<string, Track>>
}

const decodeStored = object({ version: literal(STORE_VERSION), tracks: record(decodeTrack) })

export const encodeStoredTracks = (tracks: Readonly<Record<string, Track>>): StoredTracks => ({
  version: STORE_VERSION,
  tracks,
})

/** The tracks a stored value holds; nothing stored is no tracks. */
export const decodeStoredTracks = (stored: unknown): Result<Readonly<Record<string, Track>>, DecodeError> => {
  if (stored === undefined) return ok({})
  const decoded = decodeStored(stored)
  return decoded.ok ? ok(decoded.value.tracks) : decoded
}
