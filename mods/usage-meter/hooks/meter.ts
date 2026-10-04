// The Meter: the latest readings, every window's track and the time it last
// read. Each change is a pure step from one Meter to the next.
import type { Meter, Reading, Track } from '../types'
import { limitWindowOf, lookbackMsOf } from './limit-window'
import { hasLapsed, recordReading } from './track'

export const EMPTY_METER: Meter = { readings: [], tracks: {}, nowMs: 0 }

/**
 * Takes in the windows the engine reported at `nowMs`: each reading joins its
 * window's track; the track of a window no longer reported is kept until its
 * window resets, so a reading that briefly leaves one out costs nothing.
 */
export const observe = (meter: Meter, readings: readonly Reading[], nowMs: number): Meter => {
  const tracks: Record<string, Track> = {}
  for (const [kind, track] of Object.entries(meter.tracks)) {
    if (!hasLapsed(track, nowMs)) tracks[kind] = track
  }
  for (const reading of readings) {
    tracks[reading.kind] = recordReading(
      tracks[reading.kind],
      reading,
      nowMs,
      lookbackMsOf(limitWindowOf(reading.kind)),
    )
  }
  return { readings, tracks, nowMs }
}

/** Moves the meter's clock on, so countdowns and paces read from the new time. */
export const tick = (meter: Meter, nowMs: number): Meter => (nowMs > meter.nowMs ? { ...meter, nowMs } : meter)

/** Puts back the tracks a previous session stored, under any this session already holds. */
export const restore = (meter: Meter, stored: Readonly<Record<string, Track>>): Meter => ({
  ...meter,
  tracks: { ...stored, ...meter.tracks },
})
