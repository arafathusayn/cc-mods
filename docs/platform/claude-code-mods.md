---
title: Claude Code mods and marketplaces
type: platform
status: living
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# Claude Code mods and marketplaces

What the platform offers, as read for Claude Code 2.1.289. The API is early access: the
declarations in `mods/types/` are the authority for the installed build.

## Sources

- Claude Code's built-in `plugin-authoring` skill: its guide, long-form reference, examples
  (pane, band, tool-call rule) and the per-build API declaration.
- Docs at `https://code.claude.com/docs/en/<page>.md` (index `/docs/llms.txt`):
  `plugins/mods/{overview,create,test,reference}`, `plugin-marketplaces`,
  `plugins/{publish,host-marketplace,marketplace-reference,manifest-reference,dependencies}`.
- `anthropics/claude-code` → `mods/` (built-in mods; a shared `tsconfig.json` and committed
  `types/`) and `anthropics/claude-code-playground` → `claude-code/mods/` (a sample marketplace).
- `claude plugin --help` and its `validate`, `test`, `tag` and `marketplace add` subcommands.

## Mods

- A mod is a plugin with three files: `.claude-plugin/plugin.json`, `hooks/hooks.json`
  (`{ "modules": ["./register.tsx"] }`, one path) and the hooks module exporting
  `register(on, options)`. It needs Claude Code 2.1.287 or later.
- A hook is `($, e, next)`: `$` the engine API (`$.ui`, `$.command`, `$.state`, `$.store`, `$.fs`,
  `$.process`, `$.model`, `$.tool`, `$.clock`, ...), `e` the frozen event input, `next(e)` the rest
  of the chain. A hook observes (`next(e)`), rewrites (`next({ ...e, ... })`) or answers (returns
  without `next`).
- The module has no DOM and no Node. JSX compiles against `h`; elements come from
  `$.ui.resolve(e)`. Hooks run in every session that loads the plugin; drawing appears in the
  terminal and the desktop Code tab.
- State a drawing reads belongs in `$.state`, declared in the mod's `types/index.d.ts` contract;
  module variables reset on every reload.
- `claude plugin validate <dir>` analyses the module statically and prints the hooks and calls it
  finds. Its rules: `$` calls written in full (no `const ui = $.ui`), event names as string
  literals, no shadowed `on`, relative imports plus `claude-code` only, no dynamic `import()`, ES
  modules only. `$` is followed only into functions declared in the hooks module itself, never
  across an import, so every `$` call lives in that file (ADR-0010).
- `session.measure` pushes `$.session.usage()`'s figures (context, rate-limit windows, cost) after
  each main-thread turn and when a rate-limit window moves a whole point; `e.changed` names the
  units that moved. Its windows are the ones the API's reply headers carry: `five_hour` and
  `seven_day` (and a gateway's `spend_limit`), not a model's own week.
- `/usage` reads the account's usage from `GET https://api.anthropic.com/api/oauth/usage` (an
  internal endpoint): a `limits` list whose `weekly_scoped` entries carry a model's own week. A
  mod reaches it with `$.http.fetch(url, { auth })` and the handle `$.session.authorize()`
  answers; the host keeps the credential (ADR-0011).
- What `next(e)` answers in a render hook may be the engine's own drawing, `{ type: 'engine' }`.
  The engine refuses it under a Box that sets `width` and draws its own instead.
- The desktop Code tab draws the `AbovePrompt` band and panes in a proportional font: glyphs
  sized in cells (`█░` bars) come out wider and wrap; Boxes sized in percent do not. It hosts the
  engine as an SDK host, so `$.ui.log` lines reach the host as messages rather than the
  transcript; refusal lines do show. The app bundles its own Claude Code build, which may differ
  from the installed CLI.
- `claude plugin test <dir>` runs `*.test.ts` against the engine with `claude-code/testing`; the
  engine's `$` takes an event's input whole (`$.command.run` needs `origin` and `presentation`).
- On every load the engine writes the build's types to `<mod>/.claude-plugin/types/` and adds a
  root `tsconfig.json` to a mod without one.
- `claude --plugin-dir <dir>` loads a mod for one session and hot-reloads it on save;
  `claude -p "/<command>" --plugin-dir <dir>` answers a mod's command without a model turn.
  A session's hot-reload folder watches the files inside it; a symbolic link to a mod elsewhere
  loads once and is not reloaded on edits there.

## Marketplaces

- `.claude-plugin/marketplace.json` needs `name`, `owner` and `plugins[]` (`name`, `source`).
  `metadata.pluginRoot` (2.1.239+) lets a source be a bare folder name.
- An entry's name must equal its plugin.json name. Plugin names starting `claude-`, `anthropic-`,
  `anthropics-` or `cc-plugin-` are refused; official marketplace names are reserved.
- `version` belongs in plugin.json alone; users receive an update only when it changes.
  `claude plugin tag` creates `<name>--v<version>` tags, which dependency ranges resolve against.
- An empty `plugins` array is a warning; `--strict` makes warnings fail.
