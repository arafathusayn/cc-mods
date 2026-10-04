---
id: history/009
chain: history
seq: 9
datetime: 2026-10-05T05:25:00+06:00
parent: history/008
links: []
records: [ADR-0012]
commits: [ebe95f4]
ci: []
---

# Install guides in the README, rendered from the catalog

`ebe95f4` (`feat(scripts): render each mod's install guide in the README`) made the README's mods
section a rendering of the catalog: an index table linking to a section per mod, each with its
description and exact install, update and uninstall commands. `bun run new` and the new
`bun run sync-readme` render it; the catalog check fails on drift. The generic `<mod>`
install line left the Install section.

## Evidence

- `bun run sync-readme` → `✔ README.md mods section updated`, then again →
  `✔ README.md mods section already current`.
- A heading in the section edited by hand → `bun run check` fails the catalog check with
  `README.md's mods section differs from the catalog; run bun run sync-readme`;
  `bun run sync-readme` restores it and the check passes (`✔ 6 checks passed`).
- Unit tests: the rendered section (index, guides, escaping, sorting, an empty catalog, a missing
  description), rendering twice gives the same README, a README without the markers is refused,
  and `syncReadme` writes once and then finds the README current.
