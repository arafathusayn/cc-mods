# Contributing to cc-mods

How the repository is laid out, how to build and check a mod, and how to release one. The
engineering standards and commit conventions every change follows are in [CLAUDE.md](CLAUDE.md);
the decisions behind them, and their reasons, are in [docs/](docs/README.md).

## Layout

```text
.claude-plugin/marketplace.json   the catalog (metadata.pluginRoot: ./mods)
kernel/                           shared kernel: Result, decoders, invariants
mods/
  tsconfig.json                   strict compiler options for every mod
  types/                          mod API types of the installed CLI (bun run sync-types)
  <mod>/
    .claude-plugin/plugin.json    name, version, description
    hooks/hooks.json              { "modules": ["./register.tsx"] }
    hooks/register.tsx            the composition root: export const register: Register
    hooks/kernel/                 mirror of kernel/ (bun run sync-kernel)
    types/index.d.ts              the mod's $.state contract, when it has one
    tests/*.test.ts               claude plugin test
    README.md                     what the mod does and how to use it
scripts/                          domain/ app/ ports.ts adapters/ cli/: repository tooling
tests/                            bun test: kernel and scripts
docs/                             adr/ and pdr/ decision records, platform notes, dev guides
kb/                               the project's history: dated milestone chains and their DAG
```

The README's mods section is rendered from the catalog; change a mod's `description` in
`.claude-plugin/marketplace.json` (and its `plugin.json`), then run `bun run sync-readme`.

## Develop

```bash
bun install                                         # also installs the commit-msg hook
bun run new my-mod "One line about what it does"   # scaffold, list in the catalog and the README
claude --plugin-dir mods/my-mod                     # live, hot-reloading session
bun run check                                       # everything CI runs, one check at a time
bun run sync-types                                  # after upgrading Claude Code
bun run sync-kernel                                 # after editing kernel/
bun run sync-readme                                 # after editing a description in the catalog
```

`check`, `test` and `typecheck` run one at a time machine-wide and wait while the machine is busy:
a 1-minute load at or above 60% of the cores, or under 20% memory free. Each wait prints the
reading and the limit. `CC_MODS_GATE_LOAD_PERCENT=80 bun run check` sets the load limit for one
run (a whole percentage of the cores; above 100 is allowed).

## Release

Bump `version` in the mod's `plugin.json` (users receive an update only when it changes), commit,
then tag it:

```bash
claude plugin tag mods/<mod> --push
```
