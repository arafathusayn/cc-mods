// The plan's usage-limit windows: how long each lasts, what people call it, and
// in which order they are shown. Pure.

export const MINUTE_MS = 60_000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

export type LimitWindow = {
  /** The name the pane gives it. */
  readonly title: string
  /** The two-letter tag the meter above the prompt gives it. */
  readonly badge: string
  /** How long one window lasts: the span its pace is measured against. */
  readonly lengthMs: number
  /** Where it sorts: the shorter, sooner-hit windows first. */
  readonly rank: number
}

// A spend limit has no fixed length; a week is the span its pace is read over.
const KNOWN: Readonly<Record<string, LimitWindow>> = {
  five_hour: { title: '5-hour limit', badge: '5H', lengthMs: 5 * HOUR_MS, rank: 0 },
  seven_day: { title: 'Weekly limit', badge: 'WK', lengthMs: 7 * DAY_MS, rank: 1 },
  spend_limit: { title: 'Spend limit', badge: 'SP', lengthMs: 7 * DAY_MS, rank: 2 },
}

/** The window a reading's `kind` names; a kind added later gets a week and its own name. */
export const limitWindowOf = (kind: string): LimitWindow =>
  (Object.hasOwn(KNOWN, kind) ? KNOWN[kind] : undefined) ?? {
    title: kind,
    badge: kind.slice(0, 2).toUpperCase(),
    lengthMs: 7 * DAY_MS,
    rank: 3,
  }

/**
 * The pace is read over at most this share of the window (an hour of the
 * 5-hour one), so it follows the current pace rather than the window's average.
 */
const LOOKBACK_SHARE = 0.2

/**
 * A pace is quoted only once the meter has watched this share of the window
 * (15 minutes of the 5-hour one): usage moves in steps of a point or so, and one
 * step over a few minutes would read as a pace many times the real one.
 */
const MEASURING_SHARE = 0.05

export const lookbackMsOf = (window: LimitWindow): number => window.lengthMs * LOOKBACK_SHARE

export const measuringMsOf = (window: LimitWindow): number => window.lengthMs * MEASURING_SHARE
