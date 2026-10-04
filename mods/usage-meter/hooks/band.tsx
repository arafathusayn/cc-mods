// The meter above the prompt: one line at the band's right end, each window's
// entry beside the next (`5H 14% 2h 55m │ WK 76% 4d 0h`). Pure: drawn from the
// surface's element table and the Meter's entries.
import type { Elements, RenderElement, RenderSurface } from 'claude-code'

import type { Meter } from '../types'
import { forecast } from './forecast'
import {
  METER_ENTRY_GAP,
  METER_HEIGHT,
  METER_WINDOW_GAP,
  meterEntryOf,
  meterWidthOf,
  type MeterEntry,
  type Tone,
} from './wording'

export type Ui = Pick<Elements[RenderSurface], 'Box' | 'Text'>

const PERCENT_COLOR: Readonly<Record<Tone, { readonly color?: string }>> = {
  calm: {},
  warm: { color: 'yellow' },
  hot: { color: 'red' },
}

/**
 * Empty rows above the meter, by surface: the terminal draws the band flush
 * against the transcript, so one row sets the meter apart; the other surfaces
 * space the band themselves.
 */
const TOP_PADDING: Readonly<Record<RenderSurface, number>> = { terminal: 1, desktop: 0, vscode: 0, mobile: 0 }

/** Rows the meter takes on `surface`: its line and the padding above it. */
export const meterHeightOn = (surface: RenderSurface): number => METER_HEIGHT + TOP_PADDING[surface]

export const meterEntriesOf = (meter: Meter): readonly MeterEntry[] => forecast(meter).map(meterEntryOf)

/** True when there is a window to show and the band on `surface` has room for the meter. */
export const fitsBand = (
  entries: readonly MeterEntry[],
  band: { readonly bodyColumns: number; readonly maxRows: number },
  surface: RenderSurface,
): boolean =>
  entries.length > 0 && meterWidthOf(entries) <= band.bodyColumns && meterHeightOn(surface) <= band.maxRows

const entryOf = ({ Box, Text }: Ui, entry: MeterEntry): RenderElement => (
  <Box key={entry.kind} flexDirection="row" columnGap={METER_ENTRY_GAP}>
    <Text dimColor>{entry.badge}</Text>
    <Text bold={!entry.isStale} dimColor={entry.isStale} {...PERCENT_COLOR[entry.tone]}>
      {entry.percent}
    </Text>
    {entry.countdown.length > 0 && <Text dimColor>{entry.countdown}</Text>}
  </Box>
)

/**
 * The meter at the band's right end, under what the plugins beneath drew.
 *
 * What `next(e)` answers may be the engine's own drawing, which the engine
 * refuses under a Box that sizes itself (`width`), so it sits in a plain
 * column; the column stretches the meter's row across, and the row pushes the
 * meter to the right end, below the surface's top padding.
 */
export const meterBand = (
  ui: Ui,
  entries: readonly MeterEntry[],
  beneath: RenderElement,
  surface: RenderSurface,
): RenderElement => {
  const { Box, Text } = ui
  const paddingTop = TOP_PADDING[surface]
  const line = entries.flatMap((entry, index) =>
    index === 0
      ? [entryOf(ui, entry)]
      : [
          <Text key={`gap-${entry.kind}`} dimColor>
            │
          </Text>,
          entryOf(ui, entry),
        ],
  )
  return (
    <Box flexDirection="column">
      {beneath}
      <Box key="usage-meter-row" flexDirection="row" justifyContent="flex-end" {...(paddingTop > 0 ? { paddingTop } : {})}>
        <Box key="usage-meter" flexDirection="row" columnGap={METER_WINDOW_GAP}>
          {line}
        </Box>
      </Box>
    </Box>
  )
}
