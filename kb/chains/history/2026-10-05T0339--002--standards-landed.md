---
id: history/002
chain: history
seq: 2
datetime: 2026-10-05T03:39:38+06:00
parent: history/001
links: []
records: [ADR-0004, ADR-0005, ADR-0007]
commits: [a01f9b2, 45d482a, d0ac0fc, 9490514]
ci: [37236999042]
---

# Production standards landed

| Commit | Message |
| --- | --- |
| a01f9b2 | `feat(kernel): add result, decode and invariant shared kernel` |
| 45d482a | `refactor(scripts): rebuild tooling on domain, ports and adapters` |
| d0ac0fc | `ci: enforce conventional commits locally and in ci` |
| 9490514 | `docs: document engineering standards, layout and workflow` |

## Evidence

- `bun test ./tests`: `54 pass, 0 fail, 107 expect() calls` across 8 files.
- `tsc` over `kernel`, `scripts`, `tests` and over `mods/`: no errors.
- Scratch copy, `bun run new token-meter "Shows token use"` then `bun run check`: catalog audit,
  marketplace validate, `token-meter: validate --strict, plugin tests`, `mods: tsc`,
  `scripts: bun test`, `scripts: tsc` → `✔ 6 checks passed`.
- Kernel inside the mod runtime: a scratch mod decoding its arguments with `kernel/decode.ts`
  passed `claude plugin validate --strict` and its plugin test; `claude -p "/token-meter 7"`
  printed `token-meter: limit 7`.
- Drift: an edited `hooks/kernel/result.ts` failed the audit with
  `mods/token-meter/hooks/kernel/ is not a copy of kernel/ (result.ts); run bun run sync-kernel`.
- The commit-msg hook refused `Added stuff.`; `lint-commits.ts --range HEAD` passed the history.
- CI run 37236999042: success.
