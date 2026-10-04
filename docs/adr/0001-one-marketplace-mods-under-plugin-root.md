---
title: "ADR-0001: One marketplace, each mod in its own folder under mods/"
type: adr
id: ADR-0001
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0001: One marketplace, each mod in its own folder under mods/

**Status:** accepted. Live since [9c48b55](https://github.com/arafathusayn/cc-mods/commit/9c48b55165a8b1f4155425a43b2665f849e226c4).

## Context

The repository develops many Claude Code mods side by side and publishes all of them from one
place ([PDR-0001](../pdr/0001-one-catalog-of-mods.md)). A Claude Code marketplace is a folder whose
`.claude-plugin/marketplace.json` lists plugins and where to fetch each one; a mod is a plugin
([platform notes](../platform/claude-code-mods.md)).

## Decision

- The repository root is the marketplace root. `.claude-plugin/marketplace.json` is named
  `cc-mods` and sets `metadata.pluginRoot: "./mods"`.
- Each mod lives in `mods/<name>/`, and its entry is
  `{ "name": "<name>", "source": "<name>", "description": "..." }`: a bare folder name resolved
  under `pluginRoot`.
- Folder name, plugin.json `name` and entry `name` are the same string. Entries carry no other
  fields; `version` lives in the mod's plugin.json alone.
- A release is tagged `<name>--v<version>` (`claude plugin tag mods/<name> --push`), the form
  dependency version ranges resolve against.

## Consequences

- One `claude plugin marketplace add` gives users every mod; each installs as `<name>@cc-mods`.
- Mods version and release independently; users receive a mod's update only when its plugin.json
  `version` changes.
- Bare sources need Claude Code 2.1.239 or later (mods themselves need 2.1.287).
- An empty `plugins` array is only a warning, which `claude plugin validate --strict` turns into a
  failure; the check validates the catalog without `--strict` until it lists a mod.
- The catalog audit (`scripts/domain/catalog-audit.ts`) enforces the naming and version rules.

## Verified

In an isolated config (`CLAUDE_CONFIG_DIR` pointed at an empty folder), `claude plugin
marketplace add <repo>` then `claude plugin install probe@cc-mods` installed a scratch mod read in
place from `mods/probe`, on Claude Code 2.1.289.

## Sources

[platform notes](../platform/claude-code-mods.md);
[kb history/001](../../kb/chains/history/2026-10-05T0327--001--repository-bootstrap.md).
