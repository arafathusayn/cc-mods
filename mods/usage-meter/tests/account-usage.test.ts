import { describe, expect, test } from 'claude-code/testing'

import { decodeModelWeeks, describeAccountUsageError } from '../hooks/account-usage'
import { limitWindowOf } from '../hooks/limit-window'

const RESETS_AT = '2027-01-15T05:00:00.036608+00:00'

const modelWeek = (displayName: string, percent: number, resetsAt: string | null = RESETS_AT) => ({
  kind: 'weekly_scoped',
  group: 'weekly',
  percent,
  severity: 'normal',
  resets_at: resetsAt,
  scope: { model: { id: null, display_name: displayName }, surface: null },
  is_active: false,
})

const bodyOf = (...limits: unknown[]) => JSON.stringify({ limits })

describe('decodeModelWeeks', () => {
  test('reads each weekly window that counts one model alone, and only those', () => {
    const body = bodyOf(
      { kind: 'session', percent: 10, resets_at: RESETS_AT, scope: null },
      { kind: 'weekly_all', percent: 86, resets_at: RESETS_AT, scope: null },
      modelWeek('Fable', 30),
      { kind: 'weekly_scoped', percent: 5, resets_at: RESETS_AT, scope: { model: null, surface: { name: 'cowork' } } },
    )
    expect(decodeModelWeeks(body)).toEqual({
      ok: true,
      value: {
        readings: [{ kind: 'model-week:Fable', percentUsed: 30, resetsAtMs: Date.parse(RESETS_AT) }],
        refused: [],
      },
    })
  })

  test('takes a model week with no reset time', () => {
    const decoded = decodeModelWeeks(bodyOf(modelWeek('Sonnet', 4, null)))
    expect(decoded.ok && decoded.value.readings).toEqual([{ kind: 'model-week:Sonnet', percentUsed: 4 }])
  })

  test('leaves out only the model weeks that do not decode, saying where', () => {
    const decoded = decodeModelWeeks(bodyOf(modelWeek('Fable', -1), modelWeek('', 2), modelWeek('Opus', 7)))
    expect(decoded.ok && decoded.value.readings.map(reading => reading.kind)).toEqual(['model-week:Opus'])
    expect(decoded.ok && decoded.value.refused.map(error => [error.path, error.expected])).toEqual([
      [['percent'], 'a percent of 0 or more'],
      [['scope', 'model', 'display_name'], 'a model name'],
    ])
  })

  test('refuses an answer that is not JSON, or has no list of limits', () => {
    const notJson = decodeModelWeeks('<html>')
    expect(!notJson.ok && notJson.error.kind).toBe('account-usage/not-json')
    const noLimits = decodeModelWeeks('{"windows":[]}')
    expect(!noLimits.ok && describeAccountUsageError(noLimits.error)).toBe('$.limits must be an array (got undefined)')
  })
})

describe('a model week', () => {
  test('is labelled with the model’s name and sorts after the all-models week', () => {
    expect(limitWindowOf('model-week:Fable')).toMatchObject({ title: 'Fable weekly limit', badge: 'Fable', rank: 2 })
    expect(limitWindowOf('seven_day').rank).toBeLessThan(2)
    expect(limitWindowOf('spend_limit').rank).toBeGreaterThan(2)
  })
})
