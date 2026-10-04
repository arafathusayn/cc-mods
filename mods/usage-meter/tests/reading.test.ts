import { describe, expect, test } from 'claude-code/testing'

import { decodeReadings } from '../hooks/reading'

describe('decodeReadings', () => {
  test('parses the reset time to milliseconds', () => {
    expect(decodeReadings([{ kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-05T03:00:00Z' }])).toEqual({
      readings: [{ kind: 'five_hour', percentUsed: 23.5, resetsAtMs: Date.UTC(2026, 9, 5, 3) }],
      refused: [],
    })
  })

  test('takes a window with no reset time', () => {
    expect(decodeReadings([{ kind: 'spend_limit', percentUsed: 112 }]).readings).toEqual([
      { kind: 'spend_limit', percentUsed: 112 },
    ])
  })

  test('leaves out only the windows that do not decode, saying where', () => {
    const { readings, refused } = decodeReadings([
      { kind: 'five_hour', percentUsed: Number.NaN },
      { kind: 'seven_day', percentUsed: 2, resetsAt: 'soon' },
      { kind: 'spend_limit', percentUsed: 5 },
    ])
    expect(readings.map(reading => reading.kind)).toEqual(['spend_limit'])
    expect(refused.map(error => [error.path, error.expected])).toEqual([
      [['percentUsed'], 'a finite number'],
      [['resetsAt'], 'an ISO 8601 time'],
    ])
  })
})
