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

## Mods

| Mod | What it does |
| --- | --- |
| _none yet_ | |

## Layout

```text
.claude-plugin/marketplace.json   the catalog (pluginRoot: ./mods)
mods/
  tsconfig.json                   shared compiler options for every mod
  types/                          mod API types of the installed CLI (bun run sync-types)
  <mod>/
    .claude-plugin/plugin.json    name, version, description
    hooks/hooks.json              { "modules": ["./register.tsx"] }
    hooks/register.tsx            export const register: Register = (on, options) => { ... }
    types/index.d.ts              the mod's $.state contract, when it has one
    tests/*.test.ts               claude plugin test
    README.md
scripts/                          Bun scripts
```

## Develop

```bash
bun install
bun run new my-mod "One line about what it does"   # scaffold + list in the marketplace
claude --plugin-dir mods/my-mod                     # live, hot-reloading session
bun run check                                       # validate, test, type-check everything
bun run sync-types                                  # after upgrading Claude Code
```

A mod reads and changes your session, files and network as you, unsandboxed. Run
`claude plugin validate mods/<mod>` to see the events it hooks and the calls it makes.

## Release

Bump `version` in the mod's `plugin.json`, commit, then:

```bash
claude plugin tag mods/<mod> --push
```

## License

MIT
