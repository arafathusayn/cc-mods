// How busy the machine is, and whether a heavy check may start now.
// Heavy checks (tsc, tests, plugin validation) run one at a time machine-wide,
// and only while the machine has room: several agents checking in parallel
// can starve a shared developer machine.
import { err, ok, type Result } from '../../kernel/result'

export type MachineLoad = {
  /** The 1-minute load average. */
  readonly load1: number
  /** System-wide free memory, 0 to 100. */
  readonly freeMemoryPercent: number
}

export type LoadLimits = {
  /** A check waits while the 1-minute load is at or above this. */
  readonly maxLoad1: number
  /** A check waits while free memory is below this percentage. */
  readonly minFreeMemoryPercent: number
}

/** The share of the cores, in percent, the 1-minute load may reach before a check waits. */
export const DEFAULT_LOAD_PERCENT = 60

/**
 * Leaves room for the agents and tools already running: a load of
 * `loadPercent` of the cores (60% unless set), 20% memory free.
 */
export const loadLimitsFor = (cores: number, loadPercent: number = DEFAULT_LOAD_PERCENT): LoadLimits => ({
  maxLoad1: Math.max(1, Math.round((cores * loadPercent) / 100)),
  minFreeMemoryPercent: 20,
})

export type LoadReadingError = { readonly kind: 'load/unreadable'; readonly source: string; readonly text: string }

export const hasCapacity = (load: MachineLoad, limits: LoadLimits): boolean =>
  load.load1 < limits.maxLoad1 && load.freeMemoryPercent >= limits.minFreeMemoryPercent

/** `sysctl -n vm.loadavg` output, such as `{ 2.50 2.40 2.30 }`: the 1-minute figure. */
export const parseLoadAverage = (text: string): Result<number, LoadReadingError> => {
  const first = /^\{?\s*(\d+(?:\.\d+)?)/.exec(text.trim())?.[1]
  return first === undefined ? err({ kind: 'load/unreadable', source: 'vm.loadavg', text }) : ok(Number(first))
}

/** `memory_pressure` output: its `System-wide memory free percentage: <n>%` line. */
export const parseFreeMemoryPercent = (text: string): Result<number, LoadReadingError> => {
  const percent = /free percentage:\s*(\d+(?:\.\d+)?)%/.exec(text)?.[1]
  return percent === undefined ? err({ kind: 'load/unreadable', source: 'memory_pressure', text }) : ok(Number(percent))
}

export const describeMachineLoad = (load: MachineLoad): string =>
  `load ${load.load1.toFixed(2)}, ${load.freeMemoryPercent}% memory free`

export const describeLoadLimits = (limits: LoadLimits): string =>
  `load under ${limits.maxLoad1}, ${limits.minFreeMemoryPercent}% memory free`
