// The mod's use cases: what happens when the session starts, when the engine
// measures, when the clock ticks and when the person runs the command. Each
// moves the Meter one pure step through the ports; the drawings that read it
// redraw on their own. Failures go to the debug log; the meter keeps what it had.
import type { SessionRateLimit } from 'claude-code'

import type { Meter } from '../types'
import { decodeModelWeeks, describeAccountUsageError } from './account-usage'
import { describeDecodeError } from './kernel/decode'
import type { AsyncResult } from './kernel/result'
import {
  areModelWeeksDue,
  markModelWeeksRead,
  MODEL_WEEKS_AFTER_REPLY_MS,
  MODEL_WEEKS_WHILE_IDLE_MS,
  observe,
  observeModelWeeks,
  restore,
  tick,
} from './meter'
import {
  decodeStoredTracks,
  describeFailure,
  encodeStoredTracks,
  type EngineError,
  type MeterPorts,
} from './ports'
import { decodeReadings } from './reading'
import { paneRowsFor } from './wording'

const logged = (ports: MeterPorts, error: EngineError): void => ports.debug(`usage-meter: ${describeFailure(error)}`)

const advance = async (ports: MeterPorts, step: (meter: Meter) => Meter): AsyncResult<Meter, EngineError> => {
  const moved = await ports.updateMeter(step)
  if (!moved.ok) logged(ports, moved.error)
  return moved
}

/** Decodes the engine's windows and takes them in at the clock's time now. */
const takeIn = async (ports: MeterPorts, windows: readonly SessionRateLimit[]): AsyncResult<Meter, EngineError> => {
  const now = await ports.now()
  if (!now.ok) {
    logged(ports, now.error)
    return now
  }
  const { readings, refused } = decodeReadings(windows)
  for (const error of refused) ports.debug(`usage-meter: a window was left out: ${describeDecodeError(error)}`)
  return advance(ports, meter => observe(meter, readings, now.value))
}

/** Stores the tracks, so a restart inside a window keeps its pace. */
const keepTracks = async (ports: MeterPorts, meter: Meter): Promise<void> => {
  const saved = await ports.saveStored(encodeStoredTracks(meter.tracks))
  if (!saved.ok) logged(ports, saved.error)
}

/**
 * Reads the model weeks from the account's usage once they are older than
 * `maxAgeMs`. The turn is claimed in the Meter before the request goes out, so
 * a second trigger meanwhile does not ask again; a read that fails keeps the
 * weeks the meter had until the next turn.
 */
const refreshModelWeeks = async (ports: MeterPorts, maxAgeMs: number): Promise<void> => {
  const now = await ports.now()
  if (!now.ok) return logged(ports, now.error)
  const nowMs = now.value
  // The step may run again on a concurrent write; its last run says whether this call holds the turn.
  let isClaimed = false
  const claimed = await advance(ports, meter => {
    isClaimed = areModelWeeksDue(meter, nowMs, maxAgeMs)
    return isClaimed ? markModelWeeksRead(meter, nowMs) : meter
  })
  if (!claimed.ok || !isClaimed) return

  const body = await ports.accountUsage()
  if (!body.ok) return logged(ports, body.error)
  if (body.value === undefined) return
  const weeks = decodeModelWeeks(body.value)
  if (!weeks.ok) return ports.debug(`usage-meter: the account's usage was set aside: ${describeAccountUsageError(weeks.error)}`)
  for (const error of weeks.value.refused) {
    ports.debug(`usage-meter: a model week was left out: ${describeDecodeError(error)}`)
  }
  const moved = await advance(ports, meter => observeModelWeeks(meter, weeks.value.readings, nowMs))
  if (moved.ok) await keepTracks(ports, moved.value)
}

/**
 * The session started (or the module reloaded): list the command, put back the
 * stored tracks, take in whatever windows the engine already has and read the
 * model weeks.
 */
export const startMeter = async (ports: MeterPorts): Promise<void> => {
  const [listed, stored, windows] = await Promise.all([
    ports.registerCommand(),
    ports.loadStored(),
    ports.rateLimits(),
  ])
  if (!listed.ok) logged(ports, listed.error)
  if (!windows.ok) logged(ports, windows.error)
  if (stored.ok) {
    const tracks = decodeStoredTracks(stored.value)
    if (tracks.ok) await advance(ports, meter => restore(meter, tracks.value))
    else ports.debug(`usage-meter: ${describeFailure(tracks.error)}`)
  } else logged(ports, stored.error)
  await takeIn(ports, windows.ok ? windows.value : [])
  await refreshModelWeeks(ports, 0)
}

/** The engine measured new rate-limit figures: take them in, store the tracks, and read the model weeks when due. */
export const measureMeter = async (ports: MeterPorts, windows: readonly SessionRateLimit[]): Promise<void> => {
  const moved = await takeIn(ports, windows)
  if (!moved.ok) return
  await keepTracks(ports, moved.value)
  await refreshModelWeeks(ports, MODEL_WEEKS_AFTER_REPLY_MS)
}

/** A minute passed: move the countdowns and paces on, and read the model weeks when due. */
export const tickMeter = async (ports: MeterPorts): Promise<void> => {
  const now = await ports.now()
  if (!now.ok) return logged(ports, now.error)
  await advance(ports, meter => tick(meter, now.value))
  await refreshModelWeeks(ports, MODEL_WEEKS_WHILE_IDLE_MS)
}

/** `/usage-meter`: opens the pane, or closes it when it is open. Answers the line the transcript shows. */
export const togglePane = async (ports: MeterPorts): Promise<string> => {
  const isOpen = await ports.isPaneOpen()
  if (!isOpen.ok) return `usage-meter: ${describeFailure(isOpen.error)}; the pane was left as it was`
  if (isOpen.value) {
    const closed = await ports.closePane()
    return closed.ok ? 'Usage pane closed.' : `usage-meter: the pane did not close (${closed.error.cause})`
  }
  const meter = await ports.readMeter()
  const windows = meter.ok ? meter.value.readings.length + meter.value.modelReadings.length : 0
  const placed = await ports.openPane(paneRowsFor(Math.max(1, windows)))
  if (!placed.ok) return `usage-meter: the pane did not open (${placed.error.cause})`
  return placed.value
    ? 'Usage pane open. Run /usage-meter again to close it.'
    : 'Usage pane opened; it shows once the terminal is wide enough.'
}
