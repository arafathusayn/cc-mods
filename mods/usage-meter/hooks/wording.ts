// The words and glyphs the meter draws: the compact rows above the prompt and
// the pane's lines for each window. Pure: times come in as arguments.
import type { Forecast } from './forecast'
import { unreachable } from './kernel/invariant'
import { DAY_MS, HOUR_MS, MINUTE_MS } from './limit-window'

/** `14%`, or `23.5%` when the engine reports a fraction. */
export const percentText = (percent: number): string =>
  `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`

/** `42m`, `2h 55m`, `4d 0h`: a length of time, never negative, to the minute. */
export const durationText = (ms: number): string => {
  const minutes = Math.max(0, Math.round(ms / MINUTE_MS))
  const hours = Math.floor(minutes / 60)
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** `15:30` in local time, or `Sun 02:00` when it is most of a day or more from `nowMs`. */
export const clockText = (atMs: number, nowMs: number): string => {
  const at = new Date(atMs)
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  return Math.abs(atMs - nowMs) < DAY_MS - HOUR_MS ? time : `${WEEKDAYS[at.getDay()]} ${time}`
}

/** How much of a bar is filled, as a width the surfaces lay out: `14%`, never past `100%`. */
export const barFillOf = (percent: number): `${number}%` => `${Math.min(100, Math.max(0, percent))}%`

export type Tone = 'calm' | 'warm' | 'hot'

/** Calm while there is room, warm from half, hot from three quarters. */
export const toneOf = (percent: number): Tone => (percent >= 75 ? 'hot' : percent >= 50 ? 'warm' : 'calm')

/** One window's row in the meter above the prompt: `5H  14%  2h 55m`. */
export type MeterRow = {
  readonly kind: string
  readonly badge: string
  readonly percent: string
  /** The time to the reset; `reset` once it passed; empty when none is reported. */
  readonly countdown: string
  readonly tone: Tone
  /** True once the window has reset and the percent is the old window's. */
  readonly isStale: boolean
}

export const meterRowOf = (one: Forecast): MeterRow => {
  const isStale = one.outlook.kind === 'reset'
  return {
    kind: one.kind,
    badge: one.window.badge,
    percent: percentText(one.percentUsed),
    countdown: isStale ? 'reset' : one.untilResetMs === undefined ? '' : durationText(one.untilResetMs),
    tone: toneOf(one.percentUsed),
    isStale,
  }
}

/** The meter's columns: the badges, the percents and the countdowns. */
export const METER_COLUMN_GAP = 2

/**
 * Cells the meter takes across: its widest entry in each column, the gaps
 * between the columns, one cell of padding and one of border on each side.
 */
export const meterWidthOf = (rows: readonly MeterRow[]): number => {
  let badge = 0
  let percent = 0
  let countdown = 0
  for (const row of rows) {
    badge = Math.max(badge, row.badge.length)
    percent = Math.max(percent, row.percent.length)
    countdown = Math.max(countdown, row.countdown.length)
  }
  const gaps = countdown === 0 ? METER_COLUMN_GAP : 2 * METER_COLUMN_GAP
  return badge + percent + countdown + gaps + 4
}

/** Rows the meter takes down: one a window, and the border's two. */
export const meterHeightOf = (rows: readonly MeterRow[]): number => rows.length + 2

/** The lines the pane draws for one window, under its bar. */
export type WindowLines = {
  readonly heading: string
  readonly reset: string
  readonly pace: string
  readonly outlook: string
}

const resetLineOf = (one: Forecast, nowMs: number): string => {
  if (one.resetsAtMs === undefined) return 'no reset time reported'
  const at = clockText(one.resetsAtMs, nowMs)
  return one.outlook.kind === 'reset' ? `reset at ${at}` : `resets ${at} (in ${durationText(one.untilResetMs ?? 0)})`
}

const outlookLineOf = (one: Forecast, nowMs: number): string => {
  const { outlook } = one
  switch (outlook.kind) {
    case 'reset':
      return 'the next reply reads the new window'
    case 'at-limit':
      return 'limit reached'
    case 'measuring':
      return `at this pace: known in ${durationText(outlook.remainingMs)}`
    case 'steady':
      return 'at this pace: not rising'
    case 'lasts':
      return 'at this pace: lasts until the reset'
    case 'runs-out':
      return `at this pace: runs out in ~${durationText(outlook.fullInMs)}, at ${clockText(nowMs + outlook.fullInMs, nowMs)}`
    default:
      return unreachable(outlook)
  }
}

export const windowLinesOf = (one: Forecast, nowMs: number): WindowLines => ({
  heading: `${one.window.title} · ${percentText(one.percentUsed)} used`,
  reset: resetLineOf(one, nowMs),
  pace:
    one.pace === undefined
      ? 'pace: measuring'
      : `pace ${one.pace.percentPerHour.toFixed(1)}%/h over the last ${durationText(one.pace.overMs)}`,
  outlook: outlookLineOf(one, nowMs),
})

/** The rows the pane asks for while it sits inline above the prompt: six a window, two more. */
export const paneRowsFor = (windows: number): number => Math.min(26, Math.max(7, windows * 6 + 2))
