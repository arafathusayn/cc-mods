---
title: "ADR-0007: Conventional Commits, enforced by a commit-msg hook and in CI"
type: adr
id: ADR-0007
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0007: Conventional Commits, enforced by a commit-msg hook and in CI

**Status:** accepted. Live since [d0ac0fc](https://github.com/arafathusayn/cc-mods/commit/d0ac0fc239443e0fa76f73b9605a31de88727238); every commit in the history conforms.

## Decision

- Messages follow Conventional Commits 1.0.0 as `scripts/domain/commit-message.ts` applies it:
  header `<type>(<scope>)!: <subject>`; types `feat fix perf refactor docs test build ci chore
  style revert`; scope kebab-case, a mod's name for a change to one mod; subject not capitalised
  and without a trailing period; header at most 72 characters; a blank line before the body.
  Comment lines and git's scissors tail are ignored; git's own `Merge`/`Revert "` messages and
  `fixup!`/`squash!`/`amend!` markers pass.
- Locally: `.githooks/commit-msg` runs `bun scripts/cli/lint-commits.ts --file "$1"`; `bun install`
  installs it through `"prepare": "git config core.hooksPath .githooks"`.
- In CI: `lint-commits.ts --range` over the pushed or proposed commits, the SHAs passed through
  `env:` rather than interpolated into the script.

## Consequences

- The history reads as a changelog by mod (scope) and kind (type).
- Release commits read `chore(<mod>): release <version>`.
