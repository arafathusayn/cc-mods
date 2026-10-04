// LoadProbe and Clock for this machine. macOS reports its load through
// `sysctl` and `memory_pressure`; elsewhere (CI) there is no reading and the
// gate lets the check through under the lock alone.
import { all } from '../../kernel/result'
import { parseFreeMemoryPercent, parseLoadAverage } from '../domain/machine-load'
import type { Clock, LoadProbe, ProcessRunner } from '../ports'

export const darwinLoadProbe = (runner: ProcessRunner): LoadProbe => ({
  read: async () => {
    if (process.platform !== 'darwin') return undefined
    const [loadavg, pressure] = await Promise.all([
      runner.run(['sysctl', '-n', 'vm.loadavg']),
      runner.run(['memory_pressure']),
    ])
    // A sandbox that denies either tool gives no reading, never a wrong one.
    if (!loadavg.ok || !pressure.ok || loadavg.value.exitCode !== 0 || pressure.value.exitCode !== 0) return undefined
    const parsed = all([parseLoadAverage(loadavg.value.output), parseFreeMemoryPercent(pressure.value.output)])
    if (!parsed.ok) return undefined
    const [load1 = 0, freeMemoryPercent = 0] = parsed.value
    return { load1, freeMemoryPercent }
  },
})

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
}
