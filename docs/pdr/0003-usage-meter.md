---
title: "PDR-0003: usage-meter keeps the plan's usage limits on screen"
type: pdr
id: PDR-0003
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# PDR-0003: usage-meter keeps the plan's usage limits on screen

**Status:** accepted. Live since [11c48eb](https://github.com/arafathusayn/cc-mods/commit/11c48eb).

## Decision

The first mod, `usage-meter`, shows a subscription's usage limits (the 5-hour window, the weekly
window for all models, the weekly window of a model counted on its own such as Fable, and a
gateway's spend limit) for the whole session, where Claude Code itself mentions them only once
they are nearly used up.

- **Name.** `usage-meter`, after Claude Code's own word for these windows ("usage limits",
  `/usage`), so any user recognises it; the command is `/usage-meter`.
- **Always on screen, in one line.** At the right end of the band above the prompt, no frame:
  each window's two-letter tag (`5H`, `WK`, `SP`) or, for a model's own week, the model's name
  (`Fable`), percent used in bold (yellow from 50%, red from 75%) and time to the reset (`2h 55m`,
  `4d 0h`), windows split by `│`.
- **Detail on demand.** `/usage-meter` opens or closes a pane with, per window, a bar, the reset
  as a clock time and a countdown, the recent pace and where it leads: runs out before the reset,
  lasts until it, or not rising.
- **Nothing invented.** No pace is quoted until the window has been watched long enough for one
  step of use not to read as a burst; until then the pane says when it will know. A session
  without usage limits (an API key) draws nothing.

## Engineering notes

- The pace is the change in use over the last fifth of the window (an hour of the 5-hour one),
  quoted once a twentieth of it has been watched (15 minutes); constants in
  `hooks/limit-window.ts`.
- A re-implementation of quota-meter from `Arunjay4213/claude-mods` (MIT), written anew: the
  figures are pushed by `session.measure` rather than polled, the pace runs to the present so it
  falls while idle, and only the moments use changed are stored.
- The structure follows [ADR-0010](../adr/0010-mod-structure-ports-built-in-the-hooks-module.md);
  the model weeks are read as [ADR-0011](../adr/0011-model-weeks-from-the-account-usage.md) says.
