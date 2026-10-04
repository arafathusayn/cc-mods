// The /usage-meter pane: per window a bar across the pane, the reset time, the
// pace and where it leads. Pure: drawn from the surface's element table and the
// Meter.
import type { RenderElement } from 'claude-code'

import type { Meter } from '../types'
import type { Ui } from './band'
import { forecast } from './forecast'
import { barFillOf, toneOf, windowLinesOf, type Tone } from './wording'

const BAR_COLOR: Readonly<Record<Tone, string>> = { calm: 'green', warm: 'yellow', hot: 'red' }
const TRACK_COLOR = 'gray'

export const meterPane = ({ Box, Text }: Ui, meter: Meter): RenderElement => {
  const forecasts = forecast(meter)

  if (forecasts.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold>No usage limits reported yet.</Text>
        <Text dimColor wrap="wrap">
          A subscription reports them once Claude has replied; a session on an API key has none.
        </Text>
      </Box>
    )
  }

  // A bar is two boxes the surface lays out: the filled share, then the track.
  // Glyphs (█░) would be measured in cells, which a desktop draws wider, so
  // a bar of them would wrap onto a second line there.
  return (
    <Box flexDirection="column" paddingX={1}>
      {forecasts.map(one => {
        const lines = windowLinesOf(one, meter.nowMs)
        return (
          <Box key={one.kind} flexDirection="column" marginBottom={1}>
            <Text bold wrap="truncate-end">
              {lines.heading}
            </Text>
            <Box key="bar" flexDirection="row" width="100%" height={1}>
              <Box key="used" width={barFillOf(one.percentUsed)} height={1} backgroundColor={BAR_COLOR[toneOf(one.percentUsed)]} />
              <Box key="left" flexGrow={1} height={1} backgroundColor={TRACK_COLOR} />
            </Box>
            <Text dimColor wrap="truncate-end">
              {lines.reset}
            </Text>
            <Text dimColor wrap="truncate-end">
              {lines.pace}
            </Text>
            <Text dimColor wrap="truncate-end">
              {lines.outlook}
            </Text>
          </Box>
        )
      })}
      <Text dimColor wrap="truncate-end">
        Updates after each reply and every minute. /usage-meter closes this pane.
      </Text>
    </Box>
  )
}
