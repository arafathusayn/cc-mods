---
id: history/001
chain: history
seq: 1
datetime: 2026-10-05T03:27:15+06:00
parent: null
links: []
records: [PDR-0001, ADR-0001, ADR-0002, ADR-0003]
commits: [9c48b55]
ci: []
---

# Repository bootstrap

Genesis node. The empty catalog, the shared types and the first tooling landed in `9c48b55`
(`build: scaffold the cc-mods marketplace for claude code mods`).

## State

- `.claude-plugin/marketplace.json`: `name: cc-mods`, `metadata.pluginRoot: ./mods`, no plugins.
- `mods/tsconfig.json` and `mods/types/` (`claude-code/`, `claude-code-tools/`, "Written by
  Claude Code 2.1.289.").
- Bun scripts `new`, `check`, `sync-types`; `package.json` with `typescript` and `@types/bun`;
  `bun.lock`; `.gitignore`; `.github/workflows/check.yml`; `CLAUDE.md`; `README.md`.

## Evidence

In scratch copies of the repository:

- `claude plugin validate --strict .` on the empty catalog: `⚠ plugins: Marketplace has no plugins
  defined` then `✘ Validation failed (--strict treats warnings as errors)`.
- A scaffolded mod: `✔ Validation passed` from `claude plugin validate --strict mods/probe`
  (`hooks: session.start, command.run{command=probe}`, `calls: $.command.register`) and
  `1 pass, 0 fail` from `claude plugin test mods/probe`.
- `claude -p "/probe" --plugin-dir <abs>/mods/probe` printed `probe: probe is loaded.` and wrote
  `.claude-plugin/types/{claude-code,claude-code-tools,claude-code-mcp}/index.d.ts`,
  `.claude-plugin/types/tsconfig.json` and a `.gitignore` of `*`.
- With `CLAUDE_CONFIG_DIR` set to an empty folder: `claude plugin marketplace add <copy>` →
  `✔ Successfully added marketplace: cc-mods`; `claude plugin install probe@cc-mods` →
  `✔ Successfully installed plugin: probe@cc-mods (scope: user)`, `Version: 0.1.0`, read from
  `<copy>/mods/probe`, `Status: ✔ enabled`.
