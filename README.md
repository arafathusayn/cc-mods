# cc-mods

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/plugin-marketplaces) of
[mods](https://code.claude.com/docs/en/plugins/mods/overview): panes, bands above the prompt,
slash commands and tool-call rules, written as TypeScript function hooks that run inside Claude Code.

Mods need Claude Code v2.1.287 or later.

## Install

```bash
claude plugin marketplace add arafathusayn/cc-mods
claude plugin install <mod>@cc-mods
```

In a running session, run `/reload-plugins` after installing.

A mod reads and changes your session, files and network as you, unsandboxed. Run
`claude plugin validate mods/<mod>` to list the events it hooks and the calls it makes.

## Mods

| Mod | What it does |
| --- | --- |
| _none yet_ | |

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
scripts/                          domain/ app/ ports.ts adapters/ cli/: repository tooling
tests/                            bun test: kernel and scripts
```

## Develop

```bash
bun install                                         # also installs the commit-msg hook
bun run new my-mod "One line about what it does"   # scaffold, list in marketplace and README
claude --plugin-dir mods/my-mod                     # live, hot-reloading session
bun run check                                       # everything CI runs, concurrently
bun run sync-types                                  # after upgrading Claude Code
bun run sync-kernel                                 # after editing kernel/
```

Engineering standards and commit conventions are in [CLAUDE.md](CLAUDE.md).

## Release

Bump `version` in the mod's `plugin.json`, commit, then:

```bash
claude plugin tag mods/<mod> --push
```

## License

MIT
