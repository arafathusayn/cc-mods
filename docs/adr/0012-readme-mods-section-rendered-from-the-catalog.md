---
title: "ADR-0012: The README's mods section is rendered from the catalog"
type: adr
id: ADR-0012
status: superseded
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0012: The README's mods section is rendered from the catalog

**Status:** superseded by [ADR-0013](0013-readme-for-users-one-guide-per-mod.md). Live since
[ebe95f4](https://github.com/arafathusayn/cc-mods/commit/ebe95f4).

## Context

The README listed each mod in a table that `bun run new` appended to, with one generic install
line (`claude plugin install <mod>@cc-mods`) for all of them. A reader needs the exact commands for
the mod in front of them, and a description changed in the catalog had to be copied into the
README by hand.

## Decision

- The README's mods section lies between two markers (`<!-- mods:start ... -->`,
  `<!-- mods:end -->`) and is rendered whole from `.claude-plugin/marketplace.json`
  (`scripts/domain/readme-catalog.ts`): an index table linking to a section per mod, and per mod
  its description, the exact `marketplace add` and `install` commands, `/reload-plugins`, the
  `update` and `uninstall` commands, and a link to the mod's own README. Mods sort by name.
- `bun run new` renders it after listing the mod; `bun run sync-readme` renders it on demand and
  writes the README only when it changed; the catalog check in `bun run check` fails while the
  README differs from what the catalog renders.
- Nothing between the markers is edited by hand; the README's own Install section holds no
  per-mod command.

## Consequences

- Every mod's install guide is exact, and the README cannot drift from the catalog unnoticed.
- Prose about a mod beyond its one line lives in the mod's own README.
