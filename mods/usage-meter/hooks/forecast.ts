// What the meter says about each window: how full it is, when it resets, the
// pace it is filling at and what that pace leads to before the reset. Pure.
import type { Meter, Reading, Track } from '../types'
import { HOUR_MS, limitWindowOf, lookbackMsOf, measuringMsOf, type LimitWindow } from './limit-window'
import { firstSeenMs, percentAt } from './track'

/** How fast a window fills: percent per hour, read over the last `overMs`. */
export type Pace = {
  readonly percentPerHour: number
  readonly overMs: number
}

/** Where the pace leads before the window resets. */
export type Outlook =
  /** The reset time has passed; the reading is the old window's until the next reply. */
  | { readonly kind: 'reset' }
  /** The window is full. */
  | { readonly kind: 'at-limit' }
  /** Not watched long enough for a pace yet. */
  | { readonly kind: 'measuring'; readonly remainingMs: number }
  /** Not rising. */
  | { readonly kind: 'steady' }
  /** Rising, but the window resets before it is full. */
  | { readonly kind: 'lasts'; readonly fullInMs: number }
  /** At this pace the window is full before it resets. */
  | { readonly kind: 'runs-out'; readonly fullInMs: number }

export type Forecast = {
  readonly kind: string
  readonly window: LimitWindow
  readonly percentUsed: number
  readonly resetsAtMs?: number
  readonly untilResetMs?: number
  readonly pace?: Pace
  readonly outlook: Outlook
}

const FULL = 100

/** A pace, or how much longer the window must be watched before it has one. */
type Measurement =
  | { readonly kind: 'paced'; readonly pace: Pace }
  | { readonly kind: 'measuring'; readonly remainingMs: number }

const measure = (track: Track | undefined, percentNow: number, window: LimitWindow, nowMs: number): Measurement => {
  const neededMs = measuringMsOf(window)
  if (track === undefined) return { kind: 'measuring', remainingMs: neededMs }
  const firstMs = firstSeenMs(track)
  const watchedMs = nowMs - firstMs
  if (watchedMs < neededMs) return { kind: 'measuring', remainingMs: neededMs - watchedMs }
  // The pace over the lookback, or over all the meter has seen when that is shorter.
  const fromMs = Math.max(firstMs, nowMs - lookbackMsOf(window))
  const percentThen = percentAt(track, fromMs) ?? percentNow
  const overMs = nowMs - fromMs
  return { kind: 'paced', pace: { percentPerHour: ((percentNow - percentThen) / overMs) * HOUR_MS, overMs } }
}

const outlookOf = (percentUsed: number, untilResetMs: number | undefined, measured: Measurement): Outlook => {
  if (untilResetMs === 0) return { kind: 'reset' }
  if (percentUsed >= FULL) return { kind: 'at-limit' }
  if (measured.kind === 'measuring') return measured
  if (measured.pace.percentPerHour <= 0) return { kind: 'steady' }
  const fullInMs = ((FULL - percentUsed) / measured.pace.percentPerHour) * HOUR_MS
  return untilResetMs !== undefined && fullInMs >= untilResetMs
    ? { kind: 'lasts', fullInMs }
    : { kind: 'runs-out', fullInMs }
}

const forecastOf = (reading: Reading, track: Track | undefined, nowMs: number): Forecast => {
  const window = limitWindowOf(reading.kind)
  const untilResetMs = reading.resetsAtMs === undefined ? undefined : Math.max(0, reading.resetsAtMs - nowMs)
  const measured = measure(track, reading.percentUsed, window, nowMs)
  return {
    kind: reading.kind,
    window,
    percentUsed: reading.percentUsed,
    ...(reading.resetsAtMs === undefined ? {} : { resetsAtMs: reading.resetsAtMs }),
    ...(untilResetMs === undefined ? {} : { untilResetMs }),
    ...(measured.kind === 'paced' ? { pace: measured.pace } : {}),
    outlook: outlookOf(reading.percentUsed, untilResetMs, measured),
  }
}

/** Every reported window's forecast, the model weeks among them; the soonest-hit windows first. */
export const forecast = (meter: Meter): readonly Forecast[] =>
  [...meter.readings, ...meter.modelReadings]
    .map(reading => forecastOf(reading, meter.tracks[reading.kind], meter.nowMs))
    .sort((a, b) => a.window.rank - b.window.rank || a.kind.localeCompare(b.kind))
