import { describe, expect, test } from 'bun:test'

import { runOrdered } from '../../scripts/support/ordered-pool'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('runOrdered', () => {
  test('reports in task order while running concurrently, within the limit', async () => {
    let running = 0
    let peak = 0
    const task = (value: number, ms: number) => async () => {
      running += 1
      peak = Math.max(peak, running)
      await delay(ms)
      running -= 1
      return value
    }
    const reported: number[] = []
    const started = performance.now()
    const results = await runOrdered([task(0, 40), task(1, 5), task(2, 5), task(3, 40)], 2, value => reported.push(value))

    expect(results).toEqual([0, 1, 2, 3])
    expect(reported).toEqual([0, 1, 2, 3])
    expect(peak).toBe(2)
    expect(performance.now() - started).toBeLessThan(150)
  })

  test('handles no tasks', async () => {
    expect(await runOrdered([], 4, () => {})).toEqual([])
  })
})
