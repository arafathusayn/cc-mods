# cc-mods

**Tune Claude Code from the inside.** Live meters above the prompt, panes beside the chat, new
slash commands: each installs in two commands and runs right inside your session.

[Mods](https://code.claude.com/docs/en/plugins/mods/overview) are Claude Code plugins that hook
into the session itself; they need Claude Code v2.1.287 or later. A mod reads and changes your
session, files and network as you, unsandboxed: `claude plugin validate` on its folder lists the
events it hooks and the calls it makes.

## Mods

<!-- mods:start: rendered from .claude-plugin/marketplace.json by `bun run sync-readme`; edit the catalog, not this -->

### [usage-meter](mods/usage-meter/README.md)

Shows your plan's 5-hour and weekly usage limits in one line above the prompt, with the time to each reset; /usage-meter opens a pane with your pace and when you would run out.

```bash
claude plugin marketplace add arafathusayn/cc-mods
claude plugin install usage-meter@cc-mods
```

Then `/reload-plugins` in an open session. Update: `claude plugin update usage-meter@cc-mods`.
Remove: `claude plugin uninstall usage-meter@cc-mods`.

<!-- mods:end -->

## Contributing

How the repository is laid out, how to build, check and release a mod: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[GNU Affero General Public License v3.0 only](LICENSE) (`AGPL-3.0-only`), for the repository
and every mod in it.
