---
id: history/007
chain: history
seq: 7
datetime: 2026-10-05T04:08:00+06:00
parent: history/006
links: [history/005]
records: [ADR-0009]
commits: [c8c04dc]
ci: []
---

# CI check concurrency from the host's cores

The CI run for `fc64229` failed in `bun run check`: the workflow asked for 4 concurrent checks and
the hosted runner had 2 cores, so the decoder refused the value
(`$ must be an integer from 1 to 2`). `c8c04dc` (`fix(ci): size check concurrency from the host's
cores`) made `CC_MODS_CHECK_CONCURRENCY` accept `auto`, the host's core count, cap any number at the
core count, and set CI to `auto`. ADR-0009 supersedes ADR-0006.

## Evidence

- `auto` → the host's core count; `1` → 1; `2` → 2; a number above the core count → the core count;
  empty or unset → 1.
- `0`, `abc`, `2.5`, `0x4` → `✘ CC_MODS_CHECK_CONCURRENCY: $ must be "auto" or a positive integer`,
  exit 2.
- `bun run check` → `✔ 4 checks passed`; `bun run test` → 60 pass, 0 fail.
