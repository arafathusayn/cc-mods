---
title: "PDR-0001: cc-mods is one catalog; each mod installs and updates on its own"
type: pdr
id: PDR-0001
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# PDR-0001: cc-mods is one catalog; each mod installs and updates on its own

**Status:** accepted. Live since [9c48b55](https://github.com/arafathusayn/cc-mods/commit/9c48b55165a8b1f4155425a43b2665f849e226c4).

## Decision

- cc-mods is a single Claude Code marketplace holding many mods: panes, bands above the prompt,
  slash commands and tool-call rules.
- A user adds the marketplace once and installs only the mods they want, one by one.
- Each mod has its own version and updates on its own; installing or updating one never changes
  another.
- Mods need Claude Code 2.1.287 or later.

## Why

- One place to find, trust and update every mod.
- Mods are independent features; bundling them would force every user to run code they did not
  choose.

## What users see

```bash
claude plugin marketplace add arafathusayn/cc-mods
claude plugin install <mod>@cc-mods
```

In a running session, `/reload-plugins` loads a mod installed from the shell. `/plugin` lists the
installed mods and turns them off. Each mod's README says what it does and which Claude Code
version it was tested with. A mod runs with the user's permissions, unsandboxed, so the README
also points to `claude plugin validate mods/<mod>`, which lists the events a mod hooks and the
calls it makes.

## Engineering notes

How the catalog is laid out: [ADR-0001](../adr/0001-one-marketplace-mods-under-plugin-root.md).
