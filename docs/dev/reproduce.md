---
title: Rebuild the repository from nothing
type: guide
status: living
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# Rebuild the repository from nothing

The steps that produce this repository, in order. Each names the record that explains it; the
commits named in the records hold the exact file contents.

## Prerequisites

Claude Code 2.1.287 or later (`claude --version`), Bun 1.4.2, git, and the GitHub CLI signed in to
the owning account.

## Steps

1. **Catalog and layout** ([ADR-0001](../adr/0001-one-marketplace-mods-under-plugin-root.md)):
   `.claude-plugin/marketplace.json` with `"name": "cc-mods"`, an `owner`,
   `"metadata": { "pluginRoot": "./mods" }` and `"plugins": []`; a `.gitignore` covering
   `node_modules/` and `mods/*/.claude-plugin/types/`.
2. **Tooling** ([ADR-0003](../adr/0003-tooling-in-typescript-on-bun.md)):

   ```bash
   git init -b main
   bun add -d typescript@7.0.2 @types/bun@1.4.2
   ```

3. **Types** ([ADR-0002](../adr/0002-shared-api-types-from-the-installed-cli.md)):
   `mods/tsconfig.json`, then `bun run sync-types`.
4. **Kernel and layered tooling** ([ADR-0005](../adr/0005-shared-kernel-and-boundary-decoding.md),
   [ADR-0004](../adr/0004-layered-tooling-and-production-standards.md)): `kernel/`,
   `scripts/{domain,app,adapters,cli,support}/`, `scripts/ports.ts`, `scripts/config.ts`, `tests/`,
   and the strict root `tsconfig.json` over `kernel`, `scripts` and `tests`.
5. **Check gate** ([ADR-0006](../adr/0006-heavy-checks-behind-a-machine-gate.md)):
   `scripts/cli/gated.ts` in front of `check`, `test` and `typecheck`.
6. **Commit rules** ([ADR-0007](../adr/0007-conventional-commits-enforced.md)):

   ```bash
   bun install                                   # sets core.hooksPath to .githooks
   bun scripts/cli/lint-commits.ts --range HEAD
   ```

7. **License** ([PDR-0002](../pdr/0002-agpl-license.md)): `LICENSE` from
   `https://www.gnu.org/licenses/agpl-3.0.txt`; `"license": "AGPL-3.0-only"` in `package.json` and
   `PUBLISHER.license`.
8. **CI**: `.github/workflows/check.yml`: `actions/checkout@v7` with `fetch-depth: 0`,
   `oven-sh/setup-bun@v2` reading `packageManager`, `bun install --frozen-lockfile`,
   `npm install --global @anthropic-ai/claude-code`, the commit lint, and `bun run check` with
   `CC_MODS_CHECK_CONCURRENCY: 4`.
9. **Knowledge** ([ADR-0008](../adr/0008-decision-records-and-history-chain.md)): `docs/` and `kb/`.
10. **Verify and publish**:

    ```bash
    bun run check
    gh repo create <owner>/cc-mods
    git remote add origin https://github.com/<owner>/cc-mods.git
    git push -u origin main
    ```

## Adding a mod

```bash
bun run new <name> "<one-line description>"   # scaffold, mirror the kernel, list it
claude --plugin-dir mods/<name>                # develop with hot reload
bun run check
```

Release: bump `version` in `mods/<name>/.claude-plugin/plugin.json`, commit
`chore(<name>): release <version>`, then `claude plugin tag mods/<name> --push`.
