import { describe, expect, test } from 'claude-code/testing'

import { decodeTrack, percentAt, recordReading } from '../hooks/track'
import type { Track } from '../types'

const MIN = 60_000
const HOUR = 60 * MIN
const T0 = 1_800_000_000_000
const RESET = T0 + 4 * HOUR
const LOOKBACK = HOUR

const five = (percentUsed: number, resetsAtMs: number | undefined = RESET) =>
  resetsAtMs === undefined ? { kind: 'five_hour', percentUsed } : { kind: 'five_hour', percentUsed, resetsAtMs }

describe('recordReading', () => {
  test('starts a track at the first reading', () => {
    expect(recordReading(undefined, five(10), T0, LOOKBACK)).toEqual({
      resetsAtMs: RESET,
      points: [{ atMs: T0, percent: 10 }],
    })
  })

  test('keeps the same track while use does not move', () => {
    const track = recordReading(undefined, five(10), T0, LOOKBACK)
    expect(recordReading(track, five(10), T0 + 5 * MIN, LOOKBACK)).toBe(track)
  })

  test('adds a point when use rises', () => {
    const track = recordReading(undefined, five(10), T0, LOOKBACK)
    expect(recordReading(track, five(12), T0 + 5 * MIN, LOOKBACK).points).toEqual([
      { atMs: T0, percent: 10 },
      { atMs: T0 + 5 * MIN, percent: 12 },
    ])
  })

  test('ignores a reading older than the last point', () => {
    const track = recordReading(undefined, five(10), T0, LOOKBACK)
    expect(recordReading(track, five(12), T0 - MIN, LOOKBACK)).toBe(track)
  })

  test('starts over when use falls by more than half a point', () => {
    const track = recordReading(undefined, five(40), T0, LOOKBACK)
    expect(recordReading(track, five(39.6), T0 + MIN, LOOKBACK).points).toHaveLength(2)
    expect(recordReading(track, five(3), T0 + MIN, LOOKBACK).points).toEqual([{ atMs: T0 + MIN, percent: 3 }])
  })

  test('starts over when the reset time moves by more than a minute', () => {
    const track = recordReading(undefined, five(40), T0, LOOKBACK)
    expect(recordReading(track, five(41, RESET + 30_000), T0 + MIN, LOOKBACK).points).toHaveLength(2)
    expect(recordReading(track, five(41, RESET + 5 * HOUR), T0 + MIN, LOOKBACK).points).toHaveLength(1)
  })

  test('starts over once the reset time has passed', () => {
    const track = recordReading(undefined, five(40), T0, LOOKBACK)
    expect(recordReading(track, five(45), RESET, LOOKBACK).points).toEqual([{ atMs: RESET, percent: 45 }])
  })

  test('learns the reset time from a later reading', () => {
    const track = recordReading(undefined, five(10, undefined), T0, LOOKBACK)
    expect(recordReading(track, five(10), T0 + MIN, LOOKBACK).resetsAtMs).toBe(RESET)
  })

  test('drops points older than the lookback, keeping the one that says where use stood then', () => {
    let track: Track | undefined
    for (const [minutes, percent] of [[0, 1], [20, 2], [40, 3], [80, 4], [100, 5]] as const) {
      track = recordReading(track, five(percent), T0 + minutes * MIN, LOOKBACK)
    }
    expect(track?.points.map(point => point.percent)).toEqual([3, 4, 5])
  })
})

describe('percentAt', () => {
  const track: Track = { points: [{ atMs: T0, percent: 10 }, { atMs: T0 + HOUR, percent: 20 }] }

  test('reads the last point at or before the time', () => {
    expect(percentAt(track, T0 + 30 * MIN)).toBe(10)
    expect(percentAt(track, T0 + HOUR)).toBe(20)
  })

  test('knows nothing before the first point', () => {
    expect(percentAt(track, T0 - 1)).toBeUndefined()
  })
})

describe('decodeTrack', () => {
  test('reads back a stored track', () => {
    const stored = { resetsAtMs: RESET, points: [{ atMs: T0, percent: 10 }] }
    expect(decodeTrack(stored)).toEqual({ ok: true, value: stored })
  })

  test('refuses points out of time order, an empty track, a negative percent', () => {
    for (const points of [
      [{ atMs: T0 + 1, percent: 1 }, { atMs: T0, percent: 2 }],
      [],
      [{ atMs: T0, percent: -1 }],
    ]) {
      expect(decodeTrack({ points }).ok).toBe(false)
    }
  })
})
