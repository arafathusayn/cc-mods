import { describe, expect, test } from 'bun:test'

import { waitForCapacity, type MachineGateDeps } from '../../scripts/app/machine-gate'
import {
  hasCapacity,
  loadLimitsFor,
  parseFreeMemoryPercent,
  parseLoadAverage,
  type MachineLoad,
} from '../../scripts/domain/machine-load'

const LIMITS = loadLimitsFor(10)

describe('machine load', () => {
  test('reads the 1-minute load and free memory from the macOS tools', () => {
    expect(parseLoadAverage('{ 2.50 2.40 2.30 }\n')).toEqual({ ok: true, value: 2.5 })
    expect(parseFreeMemoryPercent('The system has 100\nSystem-wide memory free percentage: 63%\n')).toEqual({
      ok: true,
      value: 63,
    })
    expect(parseLoadAverage('').ok).toBe(false)
    expect(parseFreeMemoryPercent('denied').ok).toBe(false)
  })

  test('scales the load limit with the cores', () => {
    expect(loadLimitsFor(10)).toEqual({ maxLoad1: 6, minFreeMemoryPercent: 20 })
    expect(loadLimitsFor(1).maxLoad1).toBe(1)
  })

  test('takes the load limit as a share of the cores when one is given, above 100% too', () => {
    expect(loadLimitsFor(14, 80).maxLoad1).toBe(11)
    expect(loadLimitsFor(14, 150).maxLoad1).toBe(21)
    expect(loadLimitsFor(14, 1).maxLoad1).toBe(1)
    expect(loadLimitsFor(14, 80).minFreeMemoryPercent).toBe(20)
  })

  test('has capacity below the load limit and above the memory floor', () => {
    expect(hasCapacity({ load1: 5.9, freeMemoryPercent: 20 }, LIMITS)).toBe(true)
    expect(hasCapacity({ load1: 6, freeMemoryPercent: 50 }, LIMITS)).toBe(false)
    expect(hasCapacity({ load1: 1, freeMemoryPercent: 19 }, LIMITS)).toBe(false)
  })
})

describe('waitForCapacity', () => {
  const gate = (readings: (MachineLoad | undefined)[], giveUpAfterMs = 60_000) => {
    let now = 0
    const waits: string[] = []
    const deps: MachineGateDeps = {
      probe: { read: async () => readings.shift() },
      clock: { now: () => now, sleep: async ms => void (now += ms) },
      limits: LIMITS,
      pollMs: 15_000,
      giveUpAfterMs,
      onWait: message => waits.push(message),
    }
    return { run: () => waitForCapacity(deps), waits }
  }
  const busy = { load1: 12, freeMemoryPercent: 40 }
  const idle = { load1: 3, freeMemoryPercent: 40 }

  test('waits while busy, then opens', async () => {
    const { run, waits } = gate([busy, busy, idle])
    expect(await run()).toEqual({ ok: true, value: { kind: 'gate/open', load: idle } })
    const wait = 'waiting for room: load 12.00, 40% memory free (needs load under 6, 20% memory free)'
    expect(waits).toEqual([wait, wait])
  })

  test('gives up once the deadline passes', async () => {
    const { run } = gate([busy, busy, busy, busy], 30_000)
    const outcome = await run()
    expect(outcome.ok ? '' : outcome.error.kind).toBe('gate/timed-out')
  })

  test('lets the check through unmeasured where the platform gives no reading', async () => {
    expect(await gate([undefined]).run()).toEqual({ ok: true, value: { kind: 'gate/unmeasured' } })
  })
})
