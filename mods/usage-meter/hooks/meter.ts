// The Meter: the latest readings, every window's track and the time it last
// read. Each change is a pure step from one Meter to the next.
import type { Meter, Reading, Track } from '../types'
import { limitWindowOf, lookbackMsOf, MINUTE_MS } from './limit-window'
import { hasLapsed, recordReading } from './track'

export const EMPTY_METER: Meter = { readings: [], modelReadings: [], modelsReadAtMs: 0, tracks: {}, nowMs: 0 }

/**
 * Each reading joins its window's track; the track of a window not reported
 * now is kept until its window resets, so a reading that briefly leaves one
 * out costs nothing.
 */
const recordAll = (
  tracks: Readonly<Record<string, Track>>,
  readings: readonly Reading[],
  nowMs: number,
): Readonly<Record<string, Track>> => {
  const kept: Record<string, Track> = {}
  for (const [kind, track] of Object.entries(tracks)) {
    if (!hasLapsed(track, nowMs)) kept[kind] = track
  }
  for (const reading of readings) {
    kept[reading.kind] = recordReading(kept[reading.kind], reading, nowMs, lookbackMsOf(limitWindowOf(reading.kind)))
  }
  return kept
}

/** Takes in the windows an API response reported at `nowMs`. */
export const observe = (meter: Meter, readings: readonly Reading[], nowMs: number): Meter => ({
  ...meter,
  readings,
  tracks: recordAll(meter.tracks, readings, nowMs),
  nowMs: Math.max(meter.nowMs, nowMs),
})

/** Takes in the model weeks the account's usage reported at `nowMs`. */
export const observeModelWeeks = (meter: Meter, modelReadings: readonly Reading[], nowMs: number): Meter => ({
  ...meter,
  modelReadings,
  modelsReadAtMs: nowMs,
  tracks: recordAll(meter.tracks, modelReadings, nowMs),
  nowMs: Math.max(meter.nowMs, nowMs),
})

/** Notes a read of the account's usage that came to nothing, so the next one waits its turn. */
export const markModelWeeksRead = (meter: Meter, nowMs: number): Meter => ({ ...meter, modelsReadAtMs: nowMs })

/** Moves the meter's clock on, so countdowns and paces read from the new time. */
export const tick = (meter: Meter, nowMs: number): Meter => (nowMs > meter.nowMs ? { ...meter, nowMs } : meter)

/** Puts back the tracks a previous session stored, under any this session already holds. */
export const restore = (meter: Meter, stored: Readonly<Record<string, Track>>): Meter => ({
  ...meter,
  tracks: { ...stored, ...meter.tracks },
})

// How fresh the model weeks are kept. The account's usage is one request
// the API answers for every session of the account, so it is asked at most every
// five minutes after a reply, and every quarter hour while the session sits idle.
export const MODEL_WEEKS_AFTER_REPLY_MS = 5 * MINUTE_MS
export const MODEL_WEEKS_WHILE_IDLE_MS = 15 * MINUTE_MS

/** True once the model weeks were read longer than `maxAgeMs` ago, or never. */
export const areModelWeeksDue = (meter: Meter, nowMs: number, maxAgeMs: number): boolean =>
  meter.modelsReadAtMs === 0 || nowMs - meter.modelsReadAtMs >= maxAgeMs
