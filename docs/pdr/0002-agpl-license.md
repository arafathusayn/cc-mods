---
title: "PDR-0002: The repository and every mod are licensed AGPL-3.0-only"
type: pdr
id: PDR-0002
status: accepted
decided: 2026-10-05
valid_from: 2026-10-05
recorded_at: 2026-10-05
---

# PDR-0002: The repository and every mod are licensed AGPL-3.0-only

**Status:** accepted. Live since [8c94993](https://github.com/arafathusayn/cc-mods/commit/8c94993ce250a141aad3889d1cdefe4774533f20); GitHub detects the license as `AGPL-3.0`.

## Decision

The repository and every mod in it are licensed under the GNU Affero General Public License v3.0,
SPDX `AGPL-3.0-only`.

## What users see

`LICENSE` at the repository root holds the official text (from
`https://www.gnu.org/licenses/agpl-3.0.txt`); each mod's plugin.json says
`"license": "AGPL-3.0-only"`, and so does the README.

## Engineering notes

- `PUBLISHER.license` in `scripts/config.ts` writes the license into every scaffolded mod;
  `tests/app/create-mod.test.ts` asserts it. `package.json` carries it too.
- Moving to `AGPL-3.0-or-later` would take a new PDR and a one-word change in those places.
