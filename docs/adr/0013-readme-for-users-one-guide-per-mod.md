---
title: "ADR-0013: The README is for users, one install guide per mod; development is in CONTRIBUTING.md"
type: adr
id: ADR-0013
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0013: The README is for users, one install guide per mod; development is in CONTRIBUTING.md

**Status:** accepted. Supersedes [ADR-0012](0012-readme-mods-section-rendered-from-the-catalog.md).
Live since [2e2549d](https://github.com/arafathusayn/cc-mods/commit/2e2549d).

## Context

ADR-0012 rendered the README's mods section as an index table and a guide per mod, so each
description appeared twice; and the README also carried the repository layout and the develop and
release steps, which only people working on the mods need.

## Decision

- The README is the page for people installing mods: what cc-mods is, the Claude Code version it
  needs, the mods, a pointer to `CONTRIBUTING.md`, the license.
- Its mods section lies between two markers (`<!-- mods:start ... -->`, `<!-- mods:end -->`) and
  is rendered whole from `.claude-plugin/marketplace.json` (`scripts/domain/readme-catalog.ts`):
  per mod, by name, a heading linking to the mod's own README, its description once, the exact
  `marketplace add` and `install` commands, and one line for `/reload-plugins`, `update` and
  `uninstall`. No index table: the headings are the index.
- `bun run new` renders it after listing a mod; `bun run sync-readme` renders it on demand and
  writes the README only when it changed; the catalog check in `bun run check` fails while the
  README differs from what the catalog renders. Nothing between the markers is edited by hand.
- The layout, develop and release material lives in `CONTRIBUTING.md`.

## Consequences

- Each mod's install guide is exact and appears once, and the README cannot drift from the
  catalog unnoticed.
- A contributor finds everything about working on the repository in one file GitHub links to.
