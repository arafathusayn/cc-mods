import type { SessionRateLimit } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'

import { measureMeter, startMeter, tickMeter, togglePane } from '../hooks/actions'
import { err, ok } from '../hooks/kernel/result'
import { EMPTY_METER } from '../hooks/meter'
import type { MeterPorts, StoredTracks } from '../hooks/ports'
import type { Meter } from '../types'

const MIN = 60_000
const T0 = 1_800_000_000_000
const RESETS_AT = '2027-01-15T08:00:00Z'

/** In-memory ports: the Meter, the store, the clock and the pane, with every call's failure switchable. */
const fakePorts = (start: { stored?: unknown; windows?: SessionRateLimit[] } = {}) => {
  const world = {
    meter: EMPTY_METER as Meter,
    stored: start.stored,
    nowMs: T0,
    windows: start.windows ?? [],
    isPaneOpen: false,
    debug: [] as string[],
    failing: new Set<string>(),
  }
  const call = <T,>(name: string, answer: () => T) =>
    Promise.resolve(
      world.failing.has(name) ? err({ kind: 'engine/call-failed' as const, call: name, cause: 'refused' }) : ok(answer()),
    )
  const ports: MeterPorts = {
    readMeter: () => call('state.get', () => world.meter),
    updateMeter: step => call('state.set', () => (world.meter = step(world.meter))),
    now: () => call('clock.now', () => world.nowMs),
    rateLimits: () => call('session.usage', () => world.windows),
    loadStored: () => call('store.get', () => world.stored),
    saveStored: (stored: StoredTracks) => call('store.set', () => void (world.stored = stored)),
    registerCommand: () => call('command.register', () => undefined),
    isPaneOpen: () => call('ui.panes', () => world.isPaneOpen),
    openPane: () => call('ui.open', () => (world.isPaneOpen = true)),
    closePane: () => call('ui.close', () => void (world.isPaneOpen = false)),
    debug: line => void world.debug.push(line),
  }
  return { world, ports }
}

describe('startMeter', () => {
  test('puts back the stored tracks and takes in the windows already reported', async () => {
    const stored = { version: 1, tracks: { seven_day: { points: [{ atMs: T0 - MIN, percent: 3 }] } } }
    const { world, ports } = fakePorts({
      stored,
      windows: [{ kind: 'five_hour', percentUsed: 14, resetsAt: RESETS_AT }],
    })
    await startMeter(ports)
    expect(Object.keys(world.meter.tracks).sort()).toEqual(['five_hour', 'seven_day'])
    expect(world.meter.readings).toEqual([{ kind: 'five_hour', percentUsed: 14, resetsAtMs: Date.parse(RESETS_AT) }])
    expect(world.debug).toEqual([])
  })

  test('sets aside stored tracks of another shape, saying why', async () => {
    const { world, ports } = fakePorts({ stored: { version: 0, tracks: {} } })
    await startMeter(ports)
    expect(world.meter.tracks).toEqual({})
    expect(world.debug).toEqual(['usage-meter: the stored tracks were set aside: $.version must be one of 1 (got number)'])
  })

  test('still starts when the store and the command list refuse', async () => {
    const { world, ports } = fakePorts({ windows: [{ kind: 'five_hour', percentUsed: 14 }] })
    world.failing.add('store.get').add('command.register')
    await startMeter(ports)
    expect(world.meter.readings).toHaveLength(1)
    expect(world.debug).toEqual([
      'usage-meter: command.register failed: refused',
      'usage-meter: store.get failed: refused',
    ])
  })
})

describe('measureMeter', () => {
  test('takes in the windows and stores the tracks', async () => {
    const { world, ports } = fakePorts()
    await measureMeter(ports, [{ kind: 'five_hour', percentUsed: 20 }])
    expect(world.stored).toEqual({ version: 1, tracks: { five_hour: { points: [{ atMs: T0, percent: 20 }] } } })
  })

  test('leaves the meter and the store as they were when the clock cannot be read', async () => {
    const { world, ports } = fakePorts()
    world.failing.add('clock.now')
    await measureMeter(ports, [{ kind: 'five_hour', percentUsed: 20 }])
    expect(world.meter).toBe(EMPTY_METER)
    expect(world.stored).toBeUndefined()
    expect(world.debug).toEqual(['usage-meter: clock.now failed: refused'])
  })

  test('logs a window that does not decode and keeps the rest', async () => {
    const { world, ports } = fakePorts()
    await measureMeter(ports, [
      { kind: '', percentUsed: 1 },
      { kind: 'five_hour', percentUsed: 2 },
    ])
    expect(world.meter.readings.map(reading => reading.kind)).toEqual(['five_hour'])
    expect(world.debug).toEqual(['usage-meter: a window was left out: $.kind must be a window name (got string)'])
  })
})

describe('tickMeter', () => {
  test('moves the meter’s clock on', async () => {
    const { world, ports } = fakePorts()
    world.nowMs = T0 + MIN
    await tickMeter(ports)
    expect(world.meter.nowMs).toBe(T0 + MIN)
  })
})

describe('togglePane', () => {
  test('opens the pane, then closes it', async () => {
    const { world, ports } = fakePorts()
    expect(await togglePane(ports)).toBe('Usage pane open. Run /usage-meter again to close it.')
    expect(world.isPaneOpen).toBe(true)
    expect(await togglePane(ports)).toBe('Usage pane closed.')
    expect(world.isPaneOpen).toBe(false)
  })

  test('says so when the pane cannot open', async () => {
    const { world, ports } = fakePorts()
    world.failing.add('ui.open')
    expect(await togglePane(ports)).toBe('usage-meter: the pane did not open (refused)')
  })
})
