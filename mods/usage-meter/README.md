# usage-meter

Your Claude subscription has usage limits: a 5-hour window, a weekly window for all models, a
weekly window for a model your plan counts on its own (such as Fable) and, on a Claude gateway, a
spend limit. Claude Code mentions them only once you are close. `usage-meter` keeps them on screen
the whole session, as one line at the right side above the prompt:

```
5H 14% 2h 55m  │  WK 76% 4d 0h  │  Fable 30% 4d 0h
```

Each entry is a window: how much of it is used, and how long until it resets. A model's own week
carries the model's name. The percent turns yellow from 50% and red from 75%. The line appears once
Claude has replied for the first time in a subscription session; a session on an API key has no
usage limits, so nothing is drawn.

`/usage-meter` opens a pane with more for each window: a bar drawn to the pane's width, the reset
as a clock time and a countdown, your recent pace, and where that pace leads:

```
5-hour limit · 14% used
█████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
resets 15:00 (in 2h 55m)
pace 6.0%/h over the last 1h 0m
at this pace: lasts until the reset
```

Run `/usage-meter` again to close it.

## Install

```bash
claude plugin marketplace add arafathusayn/cc-mods
claude plugin install usage-meter@cc-mods
```

## Where the figures come from

- The 5-hour and the all-models weekly windows come with every reply: Claude Code passes them on
  (`session.measure`), so the meter asks nothing for them.
- A model's own week is not in the replies. The meter reads it from your account's usage, the same
  request `/usage` makes, at most every five minutes after a reply and every quarter hour while
  the session sits idle. It asks with the session's own login through Claude Code, which keeps the
  credential and sends it to Anthropic alone; the mod never sees it. A session without a Claude
  login (an API key, a gateway) asks nothing.
- That request is the one Claude Code itself uses, not a published API. Should its answer change
  shape, the model weeks are left out and the rest of the meter carries on.

## How the pace is worked out

- The meter keeps the moments a window's use changed, so the pace survives a restart inside the
  same window.
- The pace is the change in use over the last fifth of the window (an hour of the 5-hour window,
  a little under a day and a half of the weekly one), or over everything seen when that is shorter.
- No pace is quoted until the meter has watched a twentieth of the window (15 minutes of the
  5-hour window, about 8.4 hours of the weekly one): use moves in steps of about a point, and one
  step over a few minutes would read as many times the real pace. Until then the pane says when it
  will know.
- Where the pace leads: `runs out in ~2h 5m` when the window fills before it resets, `lasts until
  the reset` when the reset comes first, `not rising` when use has not moved.
- A new window is recognised by a reset time that moved, a reset time that passed, or use that
  fell; the old window's history is dropped.

## Develop

```bash
claude --plugin-dir mods/usage-meter
```

`hooks/register.tsx` is the only file that touches `$`: it builds the ports the use cases in
`hooks/actions.ts` run on and wires the events. The rest is pure: `reading.ts` and
`account-usage.ts` decode what the engine and the account's usage report, `track.ts` and
`meter.ts` keep the history, `forecast.ts` works out the pace, `wording.ts` writes the text,
`band.tsx` and `pane.tsx` draw.

Inspired by quota-meter from [claude-mods](https://github.com/Arunjay4213/claude-mods) (MIT);
written anew here.

Tested with Claude Code 2.1.289.
