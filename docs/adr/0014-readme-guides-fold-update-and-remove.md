---
title: "ADR-0014: Each mod's README guide leads with install and folds update and remove away"
type: adr
id: ADR-0014
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0014: Each mod's README guide leads with install and folds update and remove away

**Status:** accepted. Supersedes [ADR-0013](0013-readme-for-users-one-guide-per-mod.md).

## Context

ADR-0013 rendered each mod's guide as a heading linking to the mod's README, the description, the
install commands and one dense line holding `/reload-plugins`, `update` and `uninstall`. A
reader scanning the page met link-coloured headings and had to pick the next step out of a
run-on line.

## Decision

- The README is still the page for people installing mods, and its mods section is still
  everything under `## Mods` up to the next level-2 heading outside a code block, rendered whole
  from `.claude-plugin/marketplace.json` by `scripts/domain/readme-catalog.ts`. The catalog check
  in `bun run check` still fails while the README differs from what the catalog renders.
- Per mod, by name, the section renders:
  - a plain heading with the mod's name, so the heading is also the anchor (`#usage-meter`);
  - its description once, with any slash command in it set as code (the catalog keeps plain text,
    since the plugin browser shows it as is; a description that already holds code is left alone);
  - the exact `marketplace add` and `install` commands in one code block;
  - one line: run `/reload-plugins` in any open session, and a link to the mod's own README;
  - the `update` and `uninstall` commands in one code block inside a collapsed
    `<details>` titled "Update or remove".
- The hand-written top of the README is a centred header (name, tagline, a Claude Code version
  badge, a CI badge, links to the sections), then a "Before you install" section stating the
  version a mod needs and where to read a mod's source and list what it hooks and calls.
- `CONTRIBUTING.md` keeps the layout, develop and release material.

## Consequences

- The first thing under each mod is what it does and how to install it; the rarer steps stay one
  click away instead of crowding the install.
- Every command a reader copies is in a code block, so GitHub offers a copy button for each.
- GitHub serves the CI badge only to viewers who can see the repository's workflow runs.
