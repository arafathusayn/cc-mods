---
title: "ADR-0005: A shared kernel for results, boundary decoding and invariants, mirrored into every mod"
type: adr
id: ADR-0005
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0005: A shared kernel for results, boundary decoding and invariants, mirrored into every mod

**Status:** accepted. Live since [a01f9b2](https://github.com/arafathusayn/cc-mods/commit/a01f9b2e3f2513b9b2a92b84051ca312bf4b11a4) and [45d482a](https://github.com/arafathusayn/cc-mods/commit/45d482a697c6ada1c75e4d41ec7fbeee5c798d30).

## Context

Checks at run time must be strict yet cheap. A hooks module may import only files inside its own
plugin folder, so mods cannot import shared code from elsewhere in the repository.

## Decision

- `kernel/` is canonical and dependency-free:
  - `result.ts`: `Result<T, E>`, `ok`, `err`, `map`, `mapErr`, `andThen`, `andThenAsync`, `match`,
    `unwrapOr`, `all`, `partition`, `attempt`, `attemptAsync`. Expected failures are values;
    throwing APIs are wrapped once, at the adapter.
  - `decode.ts`: `string`, `boolean`, `number` (finite), `integer`, `literal`, `optional`,
    `nullable`, `array`, `record`, `object`, `oneOf`, `refine`, `transform`, `formatPath`,
    `describeDecodeError`. Untrusted data (JSON files, `$.store`, `$.fs`, process output, model
    text, the network, `userConfig` options) is decoded once, at the boundary, and branded types
    carry the proof inward, so nothing is checked twice.
  - `invariant.ts`: `invariant(condition, message | () => message)`, `unreachable(never)`,
    `InvariantError`. Only defects throw.
- Decoders are closures built once at module scope; the success path allocates only the decoded
  value; an error's path (`$.plugins[1].name`) is assembled only while the failure unwinds.
- Every mod carries a byte-identical mirror at `hooks/kernel/`. `bun run new` copies it,
  `bun run sync-kernel` re-mirrors it, and the catalog audit fails on drift, naming the
  differing, missing or extra files. Kernel tests live in `tests/kernel/`, so mods never mirror
  them.

## Consequences

- Mods and tooling share one error model and one way to validate input.
- A kernel change is a two-step edit: change `kernel/`, then `bun run sync-kernel`.

## Verified

A scratch mod importing all three kernel files passed `claude plugin validate --strict` and a
plugin test with good and bad arguments (`$.limit must be a positive integer (got number)`); a
headless `claude -p "/token-meter 7" --plugin-dir <dir>` answered `limit 7`. Editing a mirror made
`bun run check` fail with the drift message, and `bun run sync-kernel` cleared it.
