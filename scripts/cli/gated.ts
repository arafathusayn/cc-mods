#!/usr/bin/env bun
// bun scripts/cli/gated.ts <command...>
// Runs a heavy command one at a time machine-wide and only while the machine
// has room: it takes the checks lock (lockf, where the platform has it), then
// waits on the load gate, then runs the command with inherited output.
import { availableParallelism, tmpdir } from 'node:os'
import { join } from 'node:path'

import { describeMachineGateError, waitForCapacity } from '../app/machine-gate'
import { darwinLoadProbe, systemClock } from '../adapters/machine'
import { bunProcessRunner } from '../adapters/bun-processes'
import { loadLimitsFor } from '../domain/machine-load'
import { exitWith } from './wiring'

const LOCK_FILE = join(tmpdir(), 'cc-mods-checks.lock')
const LOCK_WAIT_SECONDS = 5400
const HELD = 'CC_MODS_GATE'
/** sysexits EX_TEMPFAIL: lockf's own timeout code, reused for the load gate. */
const EX_TEMPFAIL = 75

const command = Bun.argv.slice(2)
if (command.length === 0) exitWith('usage: bun scripts/cli/gated.ts <command...>', 2)

const run = async (argv: readonly string[], env: Record<string, string>): Promise<number> =>
  Bun.spawn([...argv], { stdio: ['inherit', 'inherit', 'inherit'], env: { ...process.env, ...env } }).exited

const lockf = Bun.which('lockf')
if (process.env[HELD] !== 'held' && lockf !== null) {
  // Re-enter this script under the lock; the inner run sees HELD and goes on.
  const code = await run([lockf, '-k', '-t', String(LOCK_WAIT_SECONDS), LOCK_FILE, process.execPath, import.meta.path, ...command], {
    [HELD]: 'held',
  })
  process.exit(code)
}

const gate = await waitForCapacity({
  probe: darwinLoadProbe(bunProcessRunner),
  clock: systemClock,
  limits: loadLimitsFor(availableParallelism()),
  pollMs: 15_000,
  giveUpAfterMs: 30 * 60_000,
  onWait: message => console.error(`… ${message}`),
})
if (!gate.ok) exitWith(describeMachineGateError(gate.error), EX_TEMPFAIL)
else if (gate.value.kind === 'gate/unmeasured') console.error('… no load reading on this machine; running under the lock alone')

process.exit(await run(command, { [HELD]: 'held' }))
