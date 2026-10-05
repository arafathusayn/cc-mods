---
id: history/013
chain: history
seq: 13
datetime: 2026-10-05T06:14:00+06:00
parent: history/012
links: []
records: [ADR-0016]
commits: [dcaa8ed]
ci: [37246677630]
---

# "Before you install" in one paragraph

`dcaa8ed` replaced the README's two-point list under "Before you install" with one paragraph:
what a mod is, the Claude Code version it needs, and how to check and update it. ADR-0016
supersedes ADR-0014.

## Evidence

- `bun run check` → `✔ 6 checks passed`; CI run 37246677630 succeeded on `dcaa8ed`.
- The repository is public; the CI badge in the README's header loads without signing in.
