import { describe, expect, test } from 'claude-code/testing'

import { forecast } from '../hooks/forecast'
import { EMPTY_METER, observe, tick } from '../hooks/meter'
import {
  barFillOf,
  durationText,
  meterHeightOf,
  meterRowOf,
  meterWidthOf,
  paneRowsFor,
  percentText,
  toneOf,
  windowLinesOf,
} from '../hooks/wording'

const MIN = 60_000
const HOUR = 60 * MIN
const T0 = 1_800_000_000_000

describe('durationText', () => {
  test('reads minutes, hours and minutes, days and hours', () => {
    expect(durationText(42 * MIN)).toBe('42m')
    expect(durationText(2 * HOUR + 55 * MIN)).toBe('2h 55m')
    expect(durationText(4 * 24 * HOUR)).toBe('4d 0h')
    expect(durationText(-5 * MIN)).toBe('0m')
  })
})

describe('percentText', () => {
  test('drops a whole number’s point and keeps one decimal otherwise', () => {
    expect(percentText(14)).toBe('14%')
    expect(percentText(23.5)).toBe('23.5%')
  })
})

describe('barFillOf', () => {
  test('is the percent as a width, clamped to 0 and 100', () => {
    expect([23.5, 130, -3].map(barFillOf)).toEqual(['23.5%', '100%', '0%'])
  })
})

describe('toneOf', () => {
  test('is calm below half, warm from half, hot from three quarters', () => {
    expect([14, 50, 74, 76].map(toneOf)).toEqual(['calm', 'warm', 'warm', 'hot'])
  })
})

describe('the meter above the prompt', () => {
  const meter = observe(
    EMPTY_METER,
    [
      { kind: 'five_hour', percentUsed: 14, resetsAtMs: T0 + 2 * HOUR + 55 * MIN },
      { kind: 'seven_day', percentUsed: 76, resetsAtMs: T0 + 4 * 24 * HOUR },
    ],
    T0,
  )
  const rows = forecast(meter).map(meterRowOf)

  test('has a row a window: badge, percent, countdown and tone', () => {
    expect(rows).toEqual([
      { kind: 'five_hour', badge: '5H', percent: '14%', countdown: '2h 55m', tone: 'calm', isStale: false },
      { kind: 'seven_day', badge: 'WK', percent: '76%', countdown: '4d 0h', tone: 'hot', isStale: false },
    ])
  })

  test('takes its widest entries, two gaps, padding and border across, and a row a window plus the border down', () => {
    expect(meterWidthOf(rows)).toBe(2 + 3 + 6 + 4 + 4)
    expect(meterHeightOf(rows)).toBe(4)
  })

  test('says reset once a window has reset', () => {
    const [row] = forecast(tick(meter, T0 + 3 * HOUR)).map(meterRowOf)
    expect(row).toMatchObject({ countdown: 'reset', isStale: true })
  })
})

describe('the pane', () => {
  test('says what the pace leads to', () => {
    const steps = [[0, 40], [60, 70]] as const
    const meter = steps.reduce(
      (seen, [minutes, percentUsed]) =>
        observe(seen, [{ kind: 'five_hour', percentUsed, resetsAtMs: T0 + 4 * HOUR }], T0 + minutes * MIN),
      EMPTY_METER,
    )
    const [one] = forecast(meter)
    if (one === undefined) throw new Error('no forecast')
    const lines = windowLinesOf(one, meter.nowMs)
    expect(lines.heading).toBe('5-hour limit · 70% used')
    expect(lines.reset).toMatch(/^resets \d\d:\d\d \(in 3h 0m\)$/)
    expect(lines.pace).toBe('pace 30.0%/h over the last 1h 0m')
    expect(lines.outlook).toMatch(/^at this pace: runs out in ~1h 0m, at \d\d:\d\d$/)
  })

  test('asks for six rows a window and two more, within 7 to 26', () => {
    expect([1, 2, 9].map(paneRowsFor)).toEqual([8, 14, 26])
  })
})
