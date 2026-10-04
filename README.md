# cc-mods

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/plugin-marketplaces) of
[mods](https://code.claude.com/docs/en/plugins/mods/overview): panes, bands above the prompt,
slash commands and tool-call rules, written as TypeScript function hooks that run inside Claude Code.

Mods need Claude Code v2.1.287 or later.

## Install

Each mod below has its own install guide. A mod reads and changes your session, files and network
as you, unsandboxed: `claude plugin validate` on its folder lists the events it hooks and the calls
it makes.

## Mods

<!-- mods:start: rendered from .claude-plugin/marketplace.json by `bun run sync-readme`; edit the catalog, not this -->

| Mod | What it does |
| --- | --- |
| [usage-meter](#usage-meter) | Shows your plan's 5-hour and weekly usage limits in one line above the prompt, with the time to each reset; /usage-meter opens a pane with your pace and when you would run out |

### usage-meter

Shows your plan's 5-hour and weekly usage limits in one line above the prompt, with the time to each reset; /usage-meter opens a pane with your pace and when you would run out.

```bash
claude plugin marketplace add arafathusayn/cc-mods
claude plugin install usage-meter@cc-mods
```

In a session that is already open, run `/reload-plugins`. Update with `claude plugin update usage-meter@cc-mods`;
remove with `claude plugin uninstall usage-meter@cc-mods`. How it works and how to use it:
[mods/usage-meter](mods/usage-meter/README.md).

<!-- mods:end -->

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
docs/                             adr/ and pdr/ decision records, platform notes, dev guides
kb/                               the project's history: dated milestone chains and their DAG
```

## Develop

```bash
bun install                                         # also installs the commit-msg hook
bun run new my-mod "One line about what it does"   # scaffold, list in marketplace and README
claude --plugin-dir mods/my-mod                     # live, hot-reloading session
bun run check                                       # everything CI runs, one check at a time
bun run sync-types                                  # after upgrading Claude Code
bun run sync-kernel                                 # after editing kernel/
bun run sync-readme                                 # after editing a description in the catalog
```

Engineering standards and commit conventions are in [CLAUDE.md](CLAUDE.md); decisions and
their reasons are in [docs/](docs/README.md).

## Release

Bump `version` in the mod's `plugin.json`, commit, then:

```bash
claude plugin tag mods/<mod> --push
```

## License

[GNU Affero General Public License v3.0 only](LICENSE) (`AGPL-3.0-only`), for the repository
and every mod in it.
