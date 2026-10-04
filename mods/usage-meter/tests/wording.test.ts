import { describe, expect, test } from 'claude-code/testing'

import { forecast } from '../hooks/forecast'
import { EMPTY_METER, observe, tick } from '../hooks/meter'
import {
  barFillOf,
  clockText,
  durationText,
  METER_HEIGHT,
  meterEntryOf,
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

describe('clockText', () => {
  test('reads to the nearest minute, so a reset a second early still reads on the hour', () => {
    const now = new Date(2027, 0, 15, 6, 0).getTime()
    expect(clockText(new Date(2027, 0, 15, 10, 59, 59, 660).getTime(), now)).toBe('11:00')
    expect(clockText(new Date(2027, 0, 15, 11, 0, 0, 36).getTime(), now)).toBe('11:00')
  })

  test('names the day once the time is most of a day away', () => {
    const now = new Date(2027, 0, 15, 6, 0).getTime()
    expect(clockText(new Date(2027, 0, 17, 2, 0).getTime(), now)).toBe('Sun 02:00')
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
  const entries = forecast(meter).map(meterEntryOf)

  test('has an entry a window: badge, percent, countdown and tone', () => {
    expect(entries).toEqual([
      { kind: 'five_hour', badge: '5H', percent: '14%', countdown: '2h 55m', tone: 'calm', isStale: false },
      { kind: 'seven_day', badge: 'WK', percent: '76%', countdown: '4d 0h', tone: 'hot', isStale: false },
    ])
  })

  test('takes every entry and the │ between them across, on one line', () => {
    const fiveHour = 2 + 1 + 3 + 1 + 6
    const weekly = 2 + 1 + 3 + 1 + 5
    expect(meterWidthOf(entries)).toBe(fiveHour + 2 + 1 + 2 + weekly)
    expect(METER_HEIGHT).toBe(1)
  })

  test('says reset once a window has reset', () => {
    const [entry] = forecast(tick(meter, T0 + 3 * HOUR)).map(meterEntryOf)
    expect(entry).toMatchObject({ countdown: 'reset', isStale: true })
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
