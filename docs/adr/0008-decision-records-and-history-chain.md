---
title: "ADR-0008: Decision records in docs/adr and docs/pdr, project history as a kb chain"
type: adr
id: ADR-0008
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0008: Decision records in docs/adr and docs/pdr, project history as a kb chain

**Status:** accepted.

## Decision

- `docs/adr/` holds architecture decision records and `docs/pdr/` product decision records:
  one decision per record, `NNNN-short-slug.md`, numbered in order of writing, with `title`,
  `type`, `id`, `status`, `decided`, `valid_from` and `recorded_at` front matter. Status is
  `proposed`, `accepted` or `superseded`. An accepted record is not edited; a changed decision
  gets a new record that supersedes the old one, linked both ways.
- `docs/platform/` and `docs/dev/` hold living pages, edited in place with `recorded_at` bumped.
- `kb/chains/<chain>/` holds append-only chronological chains of dated nodes
  (`YYYY-MM-DDTHHMM--NNN--slug.md`) whose front matter names the parent node and links to the
  records and nodes they relate to, forming a DAG; `kb/INDEX.md` lists the chains, their heads and
  the graph. A node is added at every verified milestone.
- Everything tracked is written to be publishable: project knowledge only, never conversation
  transcripts or quotes, speculation about plans, personal details, account names, machine
  details, local paths or credential setup. Code and tests use neutral sample values.

## Consequences

- "Why is it built this way" has one answer per record; "what happened when" has one chain.
- Rebuilding the repository from nothing follows [docs/dev/reproduce.md](../dev/reproduce.md).
