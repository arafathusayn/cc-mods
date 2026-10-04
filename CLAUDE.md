# cc-mods

One Claude Code plugin marketplace (`cc-mods`) holding many mods. A mod is a plugin whose
`hooks/hooks.json` names a hooks module exporting `register(on, options)`.

## Engineering standards (binding for every line in this repo: scripts, kernel and mods)

Production grade only. When a shortcut and these rules disagree, the rules win.

- **DDD.** Model the domain in its own words: value objects with branded types (`ModName`),
  aggregates that guard their invariants (`Marketplace`), domain errors as discriminated unions
  with a `kind` (`'marketplace/already-listed'`). Domain modules are pure: no I/O, no `$`, no
  clock. Layers point inward only: `cli → app → domain → kernel`, with `adapters` implementing
  `ports`.
- **SOLID.** One reason to change per module. Use cases depend on narrow port interfaces
  (`FileReader`, `FileWriter`, `ClaudeCli`, ...), never on Bun or `node:` directly, and take
  them as arguments (`createMod(deps)(input)`). The composition root (`scripts/cli/wiring.ts`;
  a mod's `hooks/register.tsx`) is the only place adapters meet use cases.
- **CUPID.** Composable (small functions over plain data), Unix philosophy (one job per
  module), Predictable (deterministic, no hidden state, same input same output), Idiomatic
  (plain TypeScript: functions, unions, `readonly`; classes only where the platform wants one,
  such as an `Error` subclass), Domain-based (names from the domain, not from tech).
- **Railway-oriented programming.** A fallible step returns `Result<T, E>` from
  `kernel/result.ts`; it does not throw. Compose with `andThen`/`map` or early returns on
  `!result.ok`. Wrap throwing APIs once, at the adapter, with `attempt`/`attemptAsync`. Throw
  only for defects, via `invariant` (`kernel/invariant.ts`).
- **Strict at runtime, cheap at runtime.** Decode untrusted data once, at the boundary, with
  `kernel/decode.ts` (JSON files, `$.store`, `$.fs`, process output, model text, network,
  `userConfig` options); branded types carry the proof inward, so nothing is re-checked. Build
  decoders at module scope, never per call. Keep hot paths (`ui.render`, `turn.step`,
  `tool.call`) free of validation and allocation beyond what they draw or pass on.
- **Correctness.** Validate everything and compute every new document before the first write;
  write through a rename (`FileWriter.writeText`, `createTree`, `replaceTree`); undo earlier
  writes when a later one fails. Keep fields the domain does not model when rewriting a file.
  Exhaustive `switch` over unions. Strict compiler flags (see the tsconfigs) are not relaxed.
- **Performance.** Run independent work concurrently (`Promise.all`, `runOrdered`), bounded by
  `availableParallelism()`. Drain child-process pipes while the child runs. Prefer one pass and
  no intermediate copies on large data. Measure before optimizing anything clever.
- **Tests.** Every domain rule and use case has unit tests (`tests/`, `bun test`); use cases are
  tested against in-memory fakes of the ports, including the failure and rollback paths. Every
  mod has `tests/*.test.ts` run by `claude plugin test`.
- **Heavy checks one at a time, machine-wide.** `tsc`, tests and `claude plugin validate/test` run
  only through `bun scripts/cli/gated.ts <cmd>` (what `bun run check|test|typecheck` do): one
  `lockf` lock (`cc-mods-checks.lock` in the system temp folder), a load gate (waits while the
  1-minute load is at or above 60% of the cores or free memory is under 20%, gives up after
  30 min with exit 75), one check at a time, `tsc
  --singleThreaded`, `bun test` without `--parallel`. Never run checks in subagents or in the
  background beside another check. Only CI raises `CC_MODS_CHECK_CONCURRENCY`.
- **File writes by agents** go through the Write and Edit tools, never heredocs, `sed -i`,
  `printf >`, or scripted rewrites.

## Knowledge base

`kb/` is the project's knowledge base: its decisions, architecture, rules and milestones as a
DAG of dated nodes; see `kb/README.md`. Add a node at every sensible checkpoint (a decision, a
new rule, a verified milestone, a release) and link it to its parents. The repository is
public: `kb/` holds project knowledge only, never conversation transcripts or quotes, people's
personal details, account names, machine details, local paths or credentials setup.

## Commits

Conventional Commits, enforced by `.githooks/commit-msg` (installed by `bun install`) and in CI:
`<type>(<scope>)!: <subject>`; types `feat fix perf refactor docs test build ci chore style
revert`; scope kebab-case, a mod's name for a change to one mod; subject lower-case, imperative,
no period, header at most 72 characters; a blank line before the body. One logical change per
commit.

## Layout

- `.claude-plugin/marketplace.json`: the catalog. `metadata.pluginRoot` is `./mods`, so each
  entry's `source` is the bare folder name. Entries carry `name`, `source`, `description` only;
  `version` lives in the mod's `plugin.json` alone.
- `kernel/`: the shared kernel (`result.ts`, `decode.ts`, `invariant.ts`). Canonical here;
  mirrored byte for byte into each mod's `hooks/kernel/` (a hooks module may import only from its
  own folder). Edit it here, then `bun run sync-kernel`. Its tests live in `tests/kernel/`.
- `mods/<name>/`: one mod per folder. Folder name = `plugin.json` name = marketplace entry name.
  - `hooks/register.tsx`: the composition root; domain logic in sibling modules under `hooks/`
  - `hooks/kernel/`: the kernel mirror
  - `types/index.d.ts`: the mod's contract, only when it keeps `$.state` or adds a noun to `$`;
    named in `plugin.json` as `"types": "./types/index.d.ts"`
  - `tests/*.test.ts`, `tsconfig.json` (extends `../tsconfig.json`), `README.md`
  - `.claude-plugin/types/` is written by the engine on every load and is gitignored
- `mods/types/`: the mod API declarations (`claude-code`, `claude-code-tools`) of the installed
  CLI, refreshed by `bun run sync-types`. The authority over any doc. Never edit by hand.
- `scripts/`: `domain/` (pure), `app/` (use cases), `ports.ts`, `adapters/` (Bun), `cli/`
  (entry points), `support/`.
- `tests/`: `bun test` unit tests of `kernel/` and `scripts/`.

## Writing a mod here

- Load the `plugin-authoring` skill for the API, but write the mod in `mods/<name>/` of this repo,
  not in `~/.claude/dev-mods/`. Start one with `bun run new <name> "<description>"`, which
  scaffolds it, mirrors the kernel and lists it in the marketplace and the README.
- Look things up in `mods/types/claude-code/index.d.ts` (grep `'tool.call'`, `Pane: {`, ...).
- Rules `claude plugin validate` enforces: write every `$` call in full (`$.ui.open(...)`, never
  `const ui = $.ui`), event names as string literals, no shadowed `on`, only relative imports
  plus `claude-code`, no dynamic `import()`, ES modules only.
- State a drawing reads goes in `$.state` (declared in `types/index.d.ts`), not module variables:
  a reload re-runs `register` and resets them.
- A hook that cannot proceed answers with the engine's own refusal shapes (`{ deny }`, `next(e)`)
  rather than throwing; a throw skips the hook.
- In tests, the engine's `$` takes an event's input whole (e.g. `$.command.run` needs `origin` and
  `presentation`).
- Plugin names must not start with `claude-`, `anthropic-`, `anthropics-` or `cc-plugin-`.

## Checking

`bun run check [mod...]` runs, concurrently: the catalog audit (folders, manifests, entries,
kernel mirrors agree), `claude plugin validate` on the marketplace and `--strict` on each mod,
each mod's plugin tests, `tsc` over mods and over kernel/scripts/tests, and `bun test`. CI runs
the same plus the commit lint.

## Trying a mod live

- CLI: `claude --plugin-dir mods/<name>` (repeat the flag for several); saves hot-reload.
- Every mod, as users get them: `claude plugin marketplace add ./` then
  `claude plugin install <name>@cc-mods`; a local-path marketplace loads in place, so edits apply
  on `/reload-plugins`.

## Releasing

Bump `version` in `mods/<name>/.claude-plugin/plugin.json` (users only update when it changes),
commit (`chore(<name>): release 0.2.0`), then `claude plugin tag mods/<name> --push` to create
`<name>--v<version>`.
