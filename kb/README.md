# Knowledge base (DAG)

The project's history as a directed acyclic graph of append-only chronological chains. Decisions
themselves live in [`docs/adr/`](../docs/adr/README.md) and [`docs/pdr/`](../docs/pdr/README.md);
a chain node records a verified milestone and links to the records it realised.

## Structure

- `kb/chains/<chain>/` holds one chain: an append-only, chronologically ordered sequence of
  node files named `YYYY-MM-DDTHHMM--NNN--slug.md` (time with its offset in the front matter,
  `NNN` the zero-padded sequence within the chain).
- Nodes are never edited after the fact. A correction is a new node that names the node it
  corrects.
- [`INDEX.md`](INDEX.md) lists every chain, its head and the graph.

## Node front matter

```yaml
---
id: <chain>/<NNN>
chain: <chain>
seq: <NNN as an integer>
datetime: <ISO 8601 with offset>
parent: <id of the previous node in this chain, or null>
links: [<ids of related nodes in other chains>]   # cross-chain edges
records: [<ADR-/PDR- ids the node realises>]      # edges into docs/
commits: [<short SHAs>]
ci: [<GitHub Actions run ids>]
---
```

## Content

Project knowledge only, written to be publishable: what changed, the evidence it works, and the
commands that reproduce it. Never conversation transcripts or quotes, speculation about plans,
personal details, account names, machine details, local paths or credential setup.
