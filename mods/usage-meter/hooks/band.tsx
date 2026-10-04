// The meter above the prompt: a small bordered table at the band's right end,
// one row a window (`5H  14%  2h 55m`). Pure: drawn from the surface's element
// table and the Meter's rows.
import type { Elements, RenderElement, RenderSurface } from 'claude-code'

import type { Meter } from '../types'
import { forecast } from './forecast'
import { METER_COLUMN_GAP, meterHeightOf, meterRowOf, meterWidthOf, type MeterRow, type Tone } from './wording'

export type Ui = Pick<Elements[RenderSurface], 'Box' | 'Text'>

const PERCENT_COLOR: Readonly<Record<Tone, { readonly color?: string }>> = {
  calm: {},
  warm: { color: 'yellow' },
  hot: { color: 'red' },
}

export const meterRowsOf = (meter: Meter): readonly MeterRow[] => forecast(meter).map(meterRowOf)

/** True when there is a window to show and the band has room for the meter. */
export const fitsBand = (rows: readonly MeterRow[], band: { readonly bodyColumns: number; readonly maxRows: number }): boolean =>
  rows.length > 0 && meterWidthOf(rows) <= band.bodyColumns && meterHeightOf(rows) <= band.maxRows

/**
 * The meter at the band's right end, under what the plugins beneath drew.
 *
 * What `next(e)` answers may be the engine's own drawing, which the engine
 * refuses under a Box that sizes itself (`width`), so it sits in a plain
 * column; the column stretches the meter's row across, and the row pushes the
 * meter to the right end.
 */
export const meterBand = ({ Box, Text }: Ui, rows: readonly MeterRow[], beneath: RenderElement): RenderElement => {
  const hasCountdown = rows.some(row => row.countdown.length > 0)
  return (
    <Box flexDirection="column">
      {beneath}
      <Box key="usage-meter-row" flexDirection="row" justifyContent="flex-end">
        <Box key="usage-meter" flexDirection="row" borderStyle="single" borderDimColor paddingX={1} columnGap={METER_COLUMN_GAP}>
          <Box key="badge" flexDirection="column">
            {rows.map(row => (
              <Text key={row.kind} dimColor>
                {row.badge}
              </Text>
            ))}
          </Box>
          <Box key="percent" flexDirection="column" alignItems="flex-end">
            {rows.map(row => (
              <Text key={row.kind} bold={!row.isStale} dimColor={row.isStale} {...PERCENT_COLOR[row.tone]}>
                {row.percent}
              </Text>
            ))}
          </Box>
          {hasCountdown && (
            <Box key="countdown" flexDirection="column">
              {rows.map(row => (
                <Text key={row.kind} dimColor>
                  {row.countdown}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
