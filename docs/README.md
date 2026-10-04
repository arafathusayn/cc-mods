---
title: cc-mods docs
type: index
status: living
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# cc-mods docs

What was decided, why, and how the repository works today.

## Where to start

| If you want to know | Read |
|---|---|
| What cc-mods offers and why | [pdr/README.md](pdr/README.md) (product decision records) |
| Why the repository is built this way | [adr/README.md](adr/README.md) (architecture decision records) |
| What Claude Code mods and marketplaces are | [platform/claude-code-mods.md](platform/claude-code-mods.md) |
| How to rebuild the repository, add a mod, release | [dev/reproduce.md](dev/reproduce.md) |
| What happened when | [../kb/INDEX.md](../kb/INDEX.md) (the history chain and its DAG) |
| The rules every change follows | [../CLAUDE.md](../CLAUDE.md) |

## Kinds of documents

| Kind | Folder | Changes how | Status values |
|---|---|---|---|
| Product decision record (PDR) | `pdr/` | Append-only; a changed decision gets a new record that supersedes the old one | proposed, accepted, superseded |
| Architecture decision record (ADR) | `adr/` | Append-only, same rule | proposed, accepted, superseded |
| Platform notes | `platform/` | Living; edit in place and bump `recorded_at` | living |
| Guides | `dev/` | Living | living |
| History | `../kb/chains/` | Append-only chronological chains | n/a |

Every document carries two dates: `valid_from`, when the content became true, and `recorded_at`,
when it was written.
