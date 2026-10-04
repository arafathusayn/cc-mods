import { describe, expect, test } from 'claude-code/testing'

import { forecast } from '../hooks/forecast'
import { EMPTY_METER, observe, restore, tick } from '../hooks/meter'
import type { Meter, Reading } from '../types'

const MIN = 60_000
const HOUR = 60 * MIN
const T0 = 1_800_000_000_000

const five = (percentUsed: number, resetsAtMs = T0 + 4 * HOUR): Reading => ({ kind: 'five_hour', percentUsed, resetsAtMs })

/** A Meter that saw `five_hour` read each `[minutes after T0, percent]` in turn. */
const watched = (steps: readonly (readonly [number, number])[], resetsAtMs?: number): Meter =>
  steps.reduce<Meter>(
    (meter, [minutes, percent]) => observe(meter, [five(percent, resetsAtMs)], T0 + minutes * MIN),
    EMPTY_METER,
  )

const outlookOf = (meter: Meter) => forecast(meter)[0]?.outlook

describe('forecast', () => {
  test('measures for 15 minutes of the 5-hour window before quoting a pace', () => {
    expect(outlookOf(watched([[0, 10], [10, 12]]))).toEqual({ kind: 'measuring', remainingMs: 5 * MIN })
  })

  test('reads the pace over the last hour', () => {
    const meter = watched([[0, 10], [30, 20], [60, 20]])
    expect(forecast(meter)[0]?.pace).toEqual({ percentPerHour: 10, overMs: HOUR })
  })

  test('reads where use stood at the start of the lookback, not where the meter first saw it', () => {
    const meter = tick(watched([[0, 10], [50, 30], [100, 40]]), T0 + 120 * MIN)
    expect(forecast(meter)[0]?.pace).toEqual({ percentPerHour: 10, overMs: HOUR })
  })

  test('says the window runs out when the pace fills it before the reset', () => {
    expect(outlookOf(watched([[0, 40], [60, 70]]))).toEqual({ kind: 'runs-out', fullInMs: HOUR })
  })

  test('says it lasts when the reset comes first', () => {
    expect(outlookOf(watched([[0, 10], [60, 15]], T0 + 2 * HOUR))).toEqual({ kind: 'lasts', fullInMs: 17 * HOUR })
  })

  test('says it is steady when use has not moved', () => {
    expect(outlookOf(watched([[0, 10], [30, 10]]))).toEqual({ kind: 'steady' })
  })

  test('says the limit is reached at 100%, past it on a spend limit', () => {
    expect(outlookOf(watched([[0, 100]]))).toEqual({ kind: 'at-limit' })
    expect(outlookOf(observe(EMPTY_METER, [{ kind: 'spend_limit', percentUsed: 112 }], T0))).toEqual({
      kind: 'at-limit',
    })
  })

  test('says the window reset once its reset time has passed', () => {
    expect(outlookOf(tick(watched([[0, 10]]), T0 + 4 * HOUR))).toEqual({ kind: 'reset' })
  })

  test('counts down to the reset', () => {
    expect(forecast(watched([[0, 10], [30, 10]]))[0]?.untilResetMs).toBe(3.5 * HOUR)
  })

  test('lists the 5-hour window first, then the weekly one, then any other', () => {
    const meter = observe(
      EMPTY_METER,
      [
        { kind: 'brand_new', percentUsed: 1 },
        { kind: 'seven_day', percentUsed: 2 },
        five(3),
      ],
      T0,
    )
    expect(forecast(meter).map(one => one.kind)).toEqual(['five_hour', 'seven_day', 'brand_new'])
  })
})

describe('observe and restore', () => {
  test('keeps the track of a window left out of one reading until its window resets', () => {
    const meter = observe(watched([[0, 10]]), [], T0 + MIN)
    expect(Object.keys(meter.tracks)).toEqual(['five_hour'])
    expect(Object.keys(observe(meter, [], T0 + 5 * HOUR).tracks)).toEqual([])
  })

  test('puts stored tracks back under the ones this session holds', () => {
    const stored = { five_hour: { points: [{ atMs: T0 - HOUR, percent: 1 }] } }
    const meter = restore(watched([[0, 10]]), stored)
    expect(meter.tracks.five_hour?.points[0]?.percent).toBe(10)
  })

  test('never moves the clock back', () => {
    const meter = watched([[10, 10]])
    expect(tick(meter, T0)).toBe(meter)
  })
})
