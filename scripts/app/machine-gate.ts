// Use case: wait until the machine has room for a heavy check.
import { err, ok, type AsyncResult } from '../../kernel/result'
import { describeLoadLimits, describeMachineLoad, hasCapacity, type LoadLimits, type MachineLoad } from '../domain/machine-load'
import type { Clock, LoadProbe } from '../ports'

export type MachineGateDeps = {
  readonly probe: LoadProbe
  readonly clock: Clock
  readonly limits: LoadLimits
  readonly pollMs: number
  readonly giveUpAfterMs: number
  /** Told about each wait, so a waiting run never looks hung. */
  readonly onWait: (message: string) => void
}

export type MachineGateOutcome = { readonly kind: 'gate/open'; readonly load: MachineLoad } | { readonly kind: 'gate/unmeasured' }

export type MachineGateError = { readonly kind: 'gate/timed-out'; readonly load: MachineLoad; readonly waitedMs: number }

/** Resolves once the load allows a check, or with `unmeasured` where the platform gives no reading. */
export const waitForCapacity = async (deps: MachineGateDeps): AsyncResult<MachineGateOutcome, MachineGateError> => {
  const started = deps.clock.now()
  for (;;) {
    const load = await deps.probe.read()
    if (load === undefined) return ok({ kind: 'gate/unmeasured' })
    if (hasCapacity(load, deps.limits)) return ok({ kind: 'gate/open', load })

    const waitedMs = deps.clock.now() - started
    if (waitedMs >= deps.giveUpAfterMs) return err({ kind: 'gate/timed-out', load, waitedMs })
    deps.onWait(`waiting for room: ${describeMachineLoad(load)} (needs ${describeLoadLimits(deps.limits)})`)
    await deps.clock.sleep(deps.pollMs)
  }
}

export const describeMachineGateError = (error: MachineGateError): string =>
  `gave up after ${Math.round(error.waitedMs / 60_000)} min waiting for room (${describeMachineLoad(error.load)})`
