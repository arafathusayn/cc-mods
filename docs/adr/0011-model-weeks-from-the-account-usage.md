---
title: "ADR-0011: Model weeks come from the account's usage, asked with the session's own login"
type: adr
id: ADR-0011
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0011: Model weeks come from the account's usage, asked with the session's own login

**Status:** accepted. Live since [eaf0a21](https://github.com/arafathusayn/cc-mods/commit/eaf0a21).

## Context

A plan can count one model on a weekly window of its own (Fable's). The API's replies carry only
the 5-hour and the all-models windows (`anthropic-ratelimit-unified-5h-*`, `-7d-*`), and
`session.measure` passes on nothing more. `/usage` reads the rest from
`GET https://api.anthropic.com/api/oauth/usage`: its `limits` list holds an entry
`{ kind: "weekly_scoped", percent, resets_at, scope: { model: { display_name } } }` per model week.
The endpoint takes the session's OAuth login and is not a published API.

## Decision

- `usage-meter` reads that endpoint through `$.http.fetch(url, { auth })` with the handle
  `$.session.authorize()` answers: the host keeps the credential and sets the header for a
  first-party host alone. A session whose login is not a `bearer` one (an API key, a gateway,
  another provider) asks nothing.
- It asks when the session starts, at most every five minutes after a reply and every quarter
  hour while idle. The turn is claimed in the Meter (`modelsReadAtMs`) before the request leaves,
  inside the state update, so two triggers in one moment ask once; a failed read waits its turn.
- Only `weekly_scoped` entries scoped to a model are taken, each decoded strictly at the boundary
  (`hooks/account-usage.ts`); one that does not decode is left out and logged, and an answer of
  another shape leaves the model weeks out while the rest of the meter carries on.
- A model week is a window of kind `model-week:<model>`, a week long, labelled with the model's
  name, sorted after the all-models week.

## Consequences

- The meter shows every limit `/usage` shows, for the cost of a few requests an hour per session.
- A change to the endpoint costs the model weeks alone, never the rest of the meter.
