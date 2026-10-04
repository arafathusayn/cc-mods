import type { SessionRateLimit } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'

import { measureMeter, startMeter, tickMeter, togglePane } from '../hooks/actions'
import { err, ok } from '../hooks/kernel/result'
import { EMPTY_METER } from '../hooks/meter'
import type { MeterPorts, StoredTracks } from '../hooks/ports'
import type { Meter } from '../types'

const MIN = 60_000
const T0 = 1_800_000_000_000
/** A day after T0, so no window has reset yet. */
const RESETS_AT = '2027-01-16T08:00:00Z'

/** The account's usage as the endpoint answers it, with one model week. */
const accountUsageWith = (percent: number) =>
  JSON.stringify({
    limits: [
      { kind: 'session', group: 'session', percent: 10, resets_at: RESETS_AT, scope: null },
      { kind: 'weekly_scoped', percent, resets_at: RESETS_AT, scope: { model: { id: null, display_name: 'Fable' } } },
    ],
  })

/** In-memory ports: the Meter, the store, the clock, the account's usage and the pane, with every call's failure switchable. */
const fakePorts = (start: { stored?: unknown; windows?: SessionRateLimit[] } = {}) => {
  const world = {
    meter: EMPTY_METER as Meter,
    stored: start.stored,
    nowMs: T0,
    windows: start.windows ?? [],
    /** The endpoint's body; undefined for a session with no first-party login. */
    accountUsage: accountUsageWith(30) as string | undefined,
    accountUsageReads: 0,
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
    accountUsage: () => call('http.fetch', () => (world.accountUsageReads += 1, world.accountUsage)),
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
    expect(Object.keys(world.meter.tracks).sort()).toEqual(['five_hour', 'model-week:Fable', 'seven_day'])
    expect(world.meter.readings).toEqual([{ kind: 'five_hour', percentUsed: 14, resetsAtMs: Date.parse(RESETS_AT) }])
    expect(world.debug).toEqual([])
  })

  test('sets aside stored tracks of another shape, saying why', async () => {
    const { world, ports } = fakePorts({ stored: { version: 0, tracks: {} } })
    world.accountUsage = undefined
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
    world.accountUsage = undefined
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

describe('the model weeks', () => {
  const fable = (percentUsed: number) => ({ kind: 'model-week:Fable', percentUsed, resetsAtMs: Date.parse(RESETS_AT) })

  test('are read from the account’s usage when the session starts, and their tracks stored', async () => {
    const { world, ports } = fakePorts()
    await startMeter(ports)
    expect(world.meter.modelReadings).toEqual([fable(30)])
    expect(world.meter.modelsReadAtMs).toBe(T0)
    expect(world.stored).toMatchObject({ tracks: { 'model-week:Fable': { points: [{ atMs: T0, percent: 30 }] } } })
  })

  test('are read once for two triggers in the same moment', async () => {
    const { world, ports } = fakePorts()
    await Promise.all([measureMeter(ports, []), tickMeter(ports)])
    expect(world.accountUsageReads).toBe(1)
  })

  test('are read again at most every five minutes after a reply', async () => {
    const { world, ports } = fakePorts()
    await measureMeter(ports, [])
    world.accountUsage = accountUsageWith(31)
    world.nowMs = T0 + 4 * MIN
    await measureMeter(ports, [])
    expect([world.accountUsageReads, world.meter.modelReadings]).toEqual([1, [fable(30)]])
    world.nowMs = T0 + 5 * MIN
    await measureMeter(ports, [])
    expect([world.accountUsageReads, world.meter.modelReadings]).toEqual([2, [fable(31)]])
  })

  test('are read again every quarter hour while the session sits idle', async () => {
    const { world, ports } = fakePorts()
    await tickMeter(ports)
    world.nowMs = T0 + 14 * MIN
    await tickMeter(ports)
    expect(world.accountUsageReads).toBe(1)
    world.nowMs = T0 + 15 * MIN
    await tickMeter(ports)
    expect(world.accountUsageReads).toBe(2)
  })

  test('are none, quietly, for a session with no first-party login', async () => {
    const { world, ports } = fakePorts()
    world.accountUsage = undefined
    await startMeter(ports)
    expect(world.meter.modelReadings).toEqual([])
    expect(world.debug).toEqual([])
  })

  test('stay as they were when a read fails, and the next read waits its turn', async () => {
    const { world, ports } = fakePorts()
    await startMeter(ports)
    world.failing.add('http.fetch')
    world.nowMs = T0 + 5 * MIN
    await measureMeter(ports, [])
    expect(world.meter.modelReadings).toEqual([fable(30)])
    expect(world.meter.modelsReadAtMs).toBe(T0 + 5 * MIN)
    expect(world.debug).toEqual(['usage-meter: http.fetch failed: refused'])
  })

  test('are set aside when the answer has another shape, saying why', async () => {
    const { world, ports } = fakePorts()
    world.accountUsage = '{"windows":[]}'
    await startMeter(ports)
    expect(world.meter.modelReadings).toEqual([])
    expect(world.debug).toEqual(["usage-meter: the account's usage was set aside: $.limits must be an array (got undefined)"])
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
