---
title: "ADR-0002: Shared mod API types in mods/types, synced from the installed Claude Code"
type: adr
id: ADR-0002
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0002: Shared mod API types in mods/types, synced from the installed Claude Code

**Status:** accepted. Live since [9c48b55](https://github.com/arafathusayn/cc-mods/commit/9c48b55165a8b1f4155425a43b2665f849e226c4).

## Context

The mod API is early access and changes between Claude Code releases; the declaration the engine
writes is the authority. The engine writes it beside every mod it loads, at
`<mod>/.claude-plugin/types/`, and adds a root `tsconfig.json` to a mod that has none.

## Decision

- One copy of the declarations is committed at `mods/types/`: the `claude-code/` and
  `claude-code-tools/` type roots. `claude-code-mcp/` is left out because it describes the MCP
  tools connected wherever the sync runs.
- `mods/tsconfig.json` holds the shared compiler options (`typeRoots: ["./types"]`, the JSX
  factory `h`, and the strict flags of [ADR-0004](0004-layered-tooling-and-production-standards.md)).
  Each mod's `tsconfig.json` extends it, so the engine never writes one of its own.
- `mods/*/.claude-plugin/types/` is gitignored.
- `bun run sync-types` refreshes `mods/types/`: it creates a throwaway probe mod in a temp folder,
  runs `claude -p /types-probe --plugin-dir <probe>` (the probe's command answers without a model
  turn), and swaps the written type roots into place.

## Consequences

- One `tsc` program type-checks every mod and its tests against the installed build.
- After a Claude Code upgrade, `bun run sync-types` and `bun run check` show what moved.
- The committed declarations name the version that wrote them on their first line.

## Sources

`anthropics/claude-code` keeps the same shape in its `mods/` folder (shared `tsconfig.json`,
committed `types/`); [platform notes](../platform/claude-code-mods.md).
