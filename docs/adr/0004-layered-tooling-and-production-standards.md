---
title: "ADR-0004: Layered tooling under DDD, SOLID, CUPID and railway-oriented programming"
type: adr
id: ADR-0004
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# ADR-0004: Layered tooling under DDD, SOLID, CUPID and railway-oriented programming

**Status:** accepted. Live since [a01f9b2](https://github.com/arafathusayn/cc-mods/commit/a01f9b2e3f2513b9b2a92b84051ca312bf4b11a4) and [45d482a](https://github.com/arafathusayn/cc-mods/commit/45d482a697c6ada1c75e4d41ec7fbeee5c798d30); the standards are binding in `CLAUDE.md` since [9490514](https://github.com/arafathusayn/cc-mods/commit/94905143f794fd4786d7b398c9dbd15fc7a2a1fe).

## Context

All code in the repository (scripts, kernel, mods) is held to production grade: DDD, SOLID,
CUPID, railway-oriented programming, and deliberate care for performance and correctness.

## Decision

Layers point inward only, `cli → app → domain → kernel`, with `adapters` implementing `ports`:

| Layer | Files | Role |
| --- | --- | --- |
| kernel | `kernel/result.ts` (see [ADR-0005](0005-shared-kernel-and-boundary-decoding.md)) | `Result<T, E>` and its combinators: expected failures as values |
| domain, pure | `scripts/domain/*.ts` | branded value objects (`ModName`, `ModDescription`), the `Marketplace` aggregate, the catalog audit, the scaffold as data, commit-message and machine-load rules |
| ports | `scripts/ports.ts` | `FileReader`, `FileWriter`, `ProcessRunner`, `ClaudeCli`, `TypeChecker`, `UnitTestRunner`, `LoadProbe`, `Clock` |
| adapters | `scripts/adapters/*.ts` | Bun and node implementations |
| app | `scripts/app/*.ts` | use cases that take their dependencies: `createMod(deps)(input)` |
| cli | `scripts/cli/*.ts`, `scripts/cli/wiring.ts` | composition root and entry points |
| support | `scripts/support/ordered-pool.ts` | bounded concurrency, results reported in plan order |

- **Correctness**: every input is validated and every new document computed before the first
  write; writes land by rename (`writeText`, `createTree`, `replaceTree`); a failed later write
  undoes the earlier ones; the `Marketplace` aggregate keeps fields it does not model when it
  rewrites the file; switches over unions are exhaustive.
- **Compiler**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, for tooling and mods alike.
- **Tests**: every domain rule and use case has `bun test` unit tests under `tests/`; use cases
  run against in-memory fakes of the ports, failure and rollback paths included. Every mod has
  `tests/*.test.ts` run by `claude plugin test`.
- **Performance**: independent work runs concurrently within the limits of
  [ADR-0006](0006-heavy-checks-behind-a-machine-gate.md); child-process pipes are drained while
  the child runs.

## Consequences

- Use cases are tested without a filesystem, processes or a clock.
- A new tool or platform is a new adapter; the domain does not change.
- The layering adds files; each module keeps one reason to change.

## Verified

`bun test ./tests` and both `tsc` projects pass. In a scratch copy, `bun run new token-meter
"Shows token use"` followed by `bun run check` passed every check.
