---
title: "ADR-0016: The README's \"Before you install\" is one paragraph on the Claude Code version"
type: adr
id: ADR-0016
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0016: The README's "Before you install" is one paragraph on the Claude Code version

**Status:** accepted. Supersedes [ADR-0014](0014-readme-guides-fold-update-and-remove.md).
Live since [dcaa8ed](https://github.com/arafathusayn/cc-mods/commit/dcaa8ed).

## Context

ADR-0014 had the README's "Before you install" section list two points: the Claude Code version
a mod needs, and where to read a mod's source and list what it hooks and calls. As a bulleted
list it read like a warning, and the second point is true of every Claude Code plugin rather than
something a reader must act on before installing one of these mods.

## Decision

- The README is the page for people installing mods. Its mods section is everything under
  `## Mods` up to the next level-2 heading outside a code block, rendered whole from
  `.claude-plugin/marketplace.json` by `scripts/domain/readme-catalog.ts`; the catalog check in
  `bun run check` fails while the README differs from what the catalog renders.
- Per mod, by name, the section renders:
  - a plain heading with the mod's name, so the heading is also the anchor (`#usage-meter`);
  - its description once, with any slash command in it set as code (the catalog keeps plain text,
    since the plugin browser shows it as is; a description that already holds code is left alone);
  - the exact `marketplace add` and `install` commands in one code block;
  - one line: run `/reload-plugins` in any open session, and a link to the mod's own README;
  - the `update` and `uninstall` commands in one code block inside a collapsed
    `<details>` titled "Update or remove".
- The hand-written top of the README is a centred header (name, tagline, a Claude Code version
  badge, a CI badge, links to the sections), then a "Before you install" section of one paragraph,
  no list: what a mod is, the Claude Code version it needs, and how to check and update it.
- `CONTRIBUTING.md` keeps the layout, develop and release material.

## Consequences

- A reader meets one requirement, stated plainly, between the header and the mods.
- The source of every mod stays one click away in the repository and in each guide's link to the
  mod's README.
