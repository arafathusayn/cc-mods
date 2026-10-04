import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import { measureMeter, startMeter, tickMeter, togglePane } from './actions'
import { fitsBand, meterBand, meterEntriesOf } from './band'
import { ACCOUNT_USAGE_URL } from './account-usage'
import { attempt, attemptAsync, describeCause, err, ok } from './kernel/result'
import { EMPTY_METER } from './meter'
import { meterPane } from './pane'
import { failed, type MeterPorts } from './ports'

// The composition root: the one file that touches `$` (the engine follows `$`
// into no other). It builds the ports the use cases run on, each `$` call
// wrapped once, and wires the events to the use cases and the views.
//
// The engine pushes the rate-limit figures (`session.measure`, after each turn
// and whenever a window moves a point), so nothing polls them; a minute tick
// moves the countdowns while the session sits idle. The weekly windows that
// count one model alone (Fable's) are in the account's usage only, read at most
// every five minutes after a reply and every quarter hour while idle.

const TICK_MS = 60_000

/**
 * The Meter the band and the pane draw from. The shape names the Meter's
 * fields: a reload whose code names another reads the old value as absent and
 * starts from an empty Meter rather than misread it.
 */
const meterState = atom({ plugin: 'usage-meter', key: 'meter' } as const, EMPTY_METER, { shape: 'meter/2' })

const portsOf = ($: EngineInterface): MeterPorts => ({
  readMeter: () => attemptAsync(() => read($, meterState), failed('state.get')),
  updateMeter: step => attemptAsync(() => update($, meterState, step), failed('state.set')),
  now: () => attemptAsync(() => $.clock.now(), failed('clock.now')),
  rateLimits: async () => {
    const usage = await attemptAsync(() => $.session.usage(), failed('session.usage'))
    return usage.ok ? ok(usage.value.rateLimits) : usage
  },
  // The session's credential stays on the host: `authorize` answers a handle,
  // and the engine sets the header for a first-party host alone.
  accountUsage: async () => {
    const authorized = await attemptAsync(() => $.session.authorize(), failed('session.authorize'))
    if (!authorized.ok) return authorized
    if (authorized.value === null || authorized.value.kind !== 'bearer') return ok(undefined)
    const handle = authorized.value.handle
    const answered = await attemptAsync(() => $.http.fetch(ACCOUNT_USAGE_URL, { auth: handle }), failed('http.fetch'))
    if (!answered.ok) return answered
    return answered.value.ok
      ? ok(answered.value.text)
      : err(failed('http.fetch')(`the account's usage answered HTTP ${answered.value.status}`))
  },
  loadStored: () => attemptAsync(() => $.store.get('tracks'), failed('store.get')),
  saveStored: stored => attemptAsync(() => $.store.set('tracks', stored), failed('store.set')),
  registerCommand: async () => {
    const listed = await attemptAsync(
      () =>
        $.command.register({
          name: 'usage-meter',
          description: 'Open or close the usage pane: each limit, its reset time and your pace',
        }),
      failed('command.register'),
    )
    return listed.ok ? ok(undefined) : listed
  },
  isPaneOpen: async () => {
    const panes = await attemptAsync(() => $.ui.panes(), failed('ui.panes'))
    return panes.ok ? ok(panes.value.some(pane => pane.id === 'usage-meter')) : panes
  },
  openPane: async rows => {
    const opened = await attemptAsync(() => $.ui.open({ id: 'usage-meter', title: 'Usage', rows }), failed('ui.open'))
    return opened.ok ? ok(opened.value.isPlaced) : opened
  },
  closePane: () => attemptAsync(() => $.ui.close({ id: 'usage-meter' }), failed('ui.close')),
  debug: line => $.ui.log(line, { to: 'debug' }),
})

export const register: Register = on => {
  // A reload runs register again and cancels the old module's timers; a session
  // that starts over (/clear) without a reload must not start a second tick.
  let ticking: Timer | undefined

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const ports = portsOf($)
    await startMeter(ports)
    ticking?.cancel()
    const timer = attempt(() => $.clock.every(TICK_MS, () => void tickMeter(ports)), describeCause)
    if (timer.ok) ticking = timer.value
    else ports.debug(`usage-meter: no minute tick (${timer.error}); the meter moves with each reply`)
    return started
  })

  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    if (e.changed.includes('rateLimits')) await measureMeter(portsOf($), e.rateLimits)
    return measured
  })

  on('command.run', { command: 'usage-meter' }, async $ => ({ text: await togglePane(portsOf($)) }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const entries = meterEntriesOf(await read($, meterState))
    if (!fitsBand(entries, e.props)) return next(e)
    return meterBand($.ui.resolve(e), entries, await next(e))
  })

  on('ui.render', { component: 'Pane', requestId: 'usage-meter' }, async ($, e) =>
    meterPane($.ui.resolve(e), await read($, meterState)),
  )
}
