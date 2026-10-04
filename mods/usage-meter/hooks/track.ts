// A Track: what the meter has seen of one window, as the points where its use
// changed. Use only rises inside a window, so a fall, a moved reset time or a
// reset time passed means a new window, and the old points no longer apply.
// Pure.
import type { Point, Reading, Track } from '../types'
import { array, number, object, optional, refine, transform, type Decoder } from './kernel/decode'
import { ok } from './kernel/result'
import { MINUTE_MS } from './limit-window'

/** A fall of more than this many points says the window started over. */
const RESET_DROP = 0.5

/** A reset time that moved by more than this belongs to another window. */
const RESET_SHIFT_MS = MINUTE_MS

/** A bound on a track's length, whatever the window: points beyond it are the oldest. */
const MAX_POINTS = 512

const lastOf = (track: Track): Point => track.points[track.points.length - 1] as Point

const startsNewWindow = (track: Track, reading: Reading, nowMs: number): boolean =>
  (track.resetsAtMs !== undefined && nowMs >= track.resetsAtMs) ||
  (track.resetsAtMs !== undefined &&
    reading.resetsAtMs !== undefined &&
    Math.abs(reading.resetsAtMs - track.resetsAtMs) > RESET_SHIFT_MS) ||
  reading.percentUsed < lastOf(track).percent - RESET_DROP

const trackOf = (resetsAtMs: number | undefined, points: readonly Point[]): Track =>
  resetsAtMs === undefined ? { points } : { resetsAtMs, points }

/**
 * Keeps the points a pace from `floorMs` on still needs: every point after it,
 * and the last one at or before it, which says where use stood at the floor.
 */
const sinceFloor = (points: readonly Point[], floorMs: number): readonly Point[] => {
  let from = 0
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if ((points[index] as Point).atMs <= floorMs) {
      from = index
      break
    }
  }
  const start = Math.max(from, points.length - MAX_POINTS)
  return start === 0 ? points : points.slice(start)
}

/**
 * Adds a reading taken at `nowMs` to a window's track (or starts one), keeping
 * only what a pace over the last `lookbackMs` needs. A reading that does not
 * move the use, or that comes from before the last point, changes no point.
 */
export const recordReading = (
  track: Track | undefined,
  reading: Reading,
  nowMs: number,
  lookbackMs: number,
): Track => {
  const point: Point = { atMs: nowMs, percent: reading.percentUsed }
  if (track === undefined || startsNewWindow(track, reading, nowMs)) return trackOf(reading.resetsAtMs, [point])

  const last = lastOf(track)
  const resetsAtMs = reading.resetsAtMs ?? track.resetsAtMs
  const isSameUse = point.percent === last.percent || point.atMs <= last.atMs
  if (isSameUse) return resetsAtMs === track.resetsAtMs ? track : trackOf(resetsAtMs, track.points)

  return trackOf(resetsAtMs, sinceFloor([...track.points, point], nowMs - lookbackMs))
}

/** Where use stood at `atMs`: the last point at or before it, if the track reaches that far back. */
export const percentAt = (track: Track, atMs: number): number | undefined => {
  for (let index = track.points.length - 1; index >= 0; index -= 1) {
    const point = track.points[index] as Point
    if (point.atMs <= atMs) return point.percent
  }
  return undefined
}

/** When the meter first saw this window. */
export const firstSeenMs = (track: Track): number => (track.points[0] as Point).atMs

/** True once the window has reset, so its points describe a window that is gone. */
export const hasLapsed = (track: Track, nowMs: number): boolean =>
  track.resetsAtMs !== undefined && nowMs >= track.resetsAtMs

const decodePoint = object({
  atMs: number,
  percent: refine(number, percent => percent >= 0, 'a percent of 0 or more'),
})

const isTimeOrdered = (points: readonly Point[]): boolean =>
  points.every((point, index) => index === 0 || (points[index - 1] as Point).atMs < point.atMs)

/** A track read back from storage: points present and in time order. */
export const decodeTrack: Decoder<Track> = transform(
  object({
    resetsAtMs: optional(number),
    points: refine(
      array(decodePoint),
      points => points.length > 0 && points.length <= MAX_POINTS && isTimeOrdered(points),
      `1 to ${MAX_POINTS} points in time order`,
    ),
  }),
  ({ resetsAtMs, points }) => ok(trackOf(resetsAtMs, points)),
)
