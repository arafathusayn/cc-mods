---
id: history/011
chain: history
seq: 11
datetime: 2026-10-05T05:59:00+06:00
parent: history/010
links: []
records: [ADR-0014]
commits: [fd0e9f1]
ci: []
---

# README guides lead with install

`fd0e9f1` gave the README a centred header (name, tagline, a Claude Code version badge, the CI
badge, section links) and a short "Before you install" section, and changed each rendered mod
guide: a plain heading, the description with slash commands set as code, the install block, one
line for `/reload-plugins` and the mod's README, and the update and uninstall commands folded in
a `<details>` block. ADR-0014 supersedes ADR-0013.

## Evidence

- `bun run sync-readme` renders the new guide; GitHub's markdown renderer shows the header
  centred, both code blocks and the folded block.
- Unit tests cover the guide, slash commands set as code, and a description already holding code
  left alone.
- `bun run check` → `✔ 6 checks passed`.
