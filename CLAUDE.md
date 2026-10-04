# cc-mods

One Claude Code plugin marketplace (`cc-mods`) holding many mods. A mod is a plugin whose
`hooks/hooks.json` names a hooks module exporting `register(on, options)`.

## Layout

- `.claude-plugin/marketplace.json`: the catalog. `metadata.pluginRoot` is `./mods`, so each
  entry's `source` is the bare folder name. Entries carry `name`, `source`, `description` only;
  `version` lives in the mod's `plugin.json` alone.
- `mods/<name>/`: one mod per folder. Folder name = `plugin.json` name = marketplace entry name.
  - `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx` (+ more files under `hooks/`)
  - `types/index.d.ts`: the mod's contract, only when it keeps `$.state` or adds a noun to `$`;
    named in `plugin.json` as `"types": "./types/index.d.ts"`
  - `tests/*.test.ts`: run by `claude plugin test`
  - `tsconfig.json`: extends `../tsconfig.json` (keeps the engine from writing its own)
  - `.claude-plugin/types/` is written by the engine on every load and is gitignored
- `mods/types/`: the mod API declarations (`claude-code`, `claude-code-tools`) of the installed CLI,
  refreshed by `bun run sync-types`. Treat them as the authority over any doc. Never edit by hand.
- `scripts/*.ts`: Bun scripts (`bun run new | check | sync-types | typecheck`).

## Writing a mod here

- Load the `plugin-authoring` skill for the API, but write the mod in `mods/<name>/` of this repo,
  not in `~/.claude/dev-mods/`. Start a new one with `bun run new <name> "<description>"`, which
  also lists it in the marketplace.
- Look things up in `mods/types/claude-code/index.d.ts` (grep `'tool.call'`, `Pane: {`, ...).
- Static-analysis rules `claude plugin validate` enforces: write every `$` call in full
  (`$.ui.open(...)`, never `const ui = $.ui`), event names as string literals, no shadowed `on`,
  only relative imports plus `claude-code`, no dynamic `import()`, ES modules only.
- State a drawing reads goes in `$.state` (declared in `types/index.d.ts`), not module variables:
  a reload re-runs `register` and resets them.
- In tests, the engine's `$` takes an event's input whole (e.g. `$.command.run` needs `origin` and
  `presentation`).
- Plugin names must not start with `claude-`, `anthropic-`, `anthropics-` or `cc-plugin-`.

## Checking

`bun run check [mod...]` validates the marketplace and each mod with `--strict`, runs each mod's
tests, cross-checks folder/manifest/entry names, and type-checks mods and scripts. CI runs the same.

## Trying a mod live

- CLI: `claude --plugin-dir mods/<name>` (repeat the flag for several); saves hot-reload.
- Every mod at once, as users get them: `claude plugin marketplace add ./` then
  `claude plugin install <name>@cc-mods`; a local-path marketplace loads in place, so edits apply on
  `/reload-plugins`.

## Releasing

Bump `version` in `mods/<name>/.claude-plugin/plugin.json` (users only update when it changes),
commit, then `claude plugin tag mods/<name> --push` to create `<name>--v<version>`.
