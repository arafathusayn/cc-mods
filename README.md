<div align="center">

# cc-mods

**Tune Claude Code from the inside.**

Live meters above the prompt, panes beside the chat, new slash commands.<br>
Each mod installs in two commands and runs right inside your session.

[![Claude Code 2.1.287 or later](https://img.shields.io/badge/Claude%20Code-2.1.287%2B-D97757)](https://code.claude.com/docs/en/plugins/mods/overview)
[![check](https://github.com/arafathusayn/cc-mods/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/arafathusayn/cc-mods/actions/workflows/check.yml)

[Mods](#mods) · [Before you install](#before-you-install) · [Contributing](CONTRIBUTING.md) · [License](#license)

</div>

## Before you install

[Mods](https://code.claude.com/docs/en/plugins/mods/overview) are Claude Code plugins that hook
into the session itself. They need Claude Code v2.1.287 or later: check with `claude --version`,
update with `claude update`.

## Mods

### usage-meter

Shows your plan's 5-hour and weekly usage limits in one line above the prompt, with the time to each reset; `/usage-meter` opens a pane with your pace and when you would run out.

```bash
claude plugin marketplace add arafathusayn/cc-mods
claude plugin install usage-meter@cc-mods
```

Then run `/reload-plugins` in any open session. [Read the usage-meter guide](mods/usage-meter/README.md).

<details>
<summary>Update or remove</summary>

```bash
claude plugin update usage-meter@cc-mods
claude plugin uninstall usage-meter@cc-mods
```

</details>

## Contributing

Building, checking and releasing a mod: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[GNU Affero General Public License v3.0 only](LICENSE) (`AGPL-3.0-only`), for the repository
and every mod in it.
