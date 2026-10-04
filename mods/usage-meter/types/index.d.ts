// usage-meter's contract: the session state it keeps in `$.state`, plain JSON
// data any plugin may read and only usage-meter writes.

/** One usage-limit window as the latest API response reported it. */
export type Reading = {
  /** `five_hour`, `seven_day`, a gateway's `spend_limit`, or a kind added later. */
  readonly kind: string
  /** How much of the window is used: 0 to 100, past 100 on an exceeded spend limit. */
  readonly percentUsed: number
  /** When the window resets, in milliseconds since the epoch, when reported. */
  readonly resetsAtMs?: number
}

/** A moment a window's use changed: from `atMs` on, it stood at `percent`. */
export type Point = {
  readonly atMs: number
  readonly percent: number
}

/** What the meter has seen of one window: its points in time order, never empty. */
export type Track = {
  readonly resetsAtMs?: number
  readonly points: readonly Point[]
}

/** Everything the meter draws from. */
export type Meter = {
  /** The windows each API response reports (`five_hour`, `seven_day`, a gateway's `spend_limit`). */
  readonly readings: readonly Reading[]
  /**
   * The weekly windows that count one model alone (`model-week:Fable`), read
   * from the account's usage, which the API responses do not carry.
   */
  readonly modelReadings: readonly Reading[]
  /** When the account's usage was last read, in milliseconds since the epoch; 0 for never. */
  readonly modelsReadAtMs: number
  /** Each window's track, by `kind`. */
  readonly tracks: Readonly<Record<string, Track>>
  /** When the meter last read the clock, in milliseconds since the epoch. */
  readonly nowMs: number
}

declare module 'claude-code' {
  interface PluginState {
    // Shaped: a reload whose code expects another shape reads the old value as absent.
    'usage-meter': { meter: Shaped<Meter> }
  }
}
