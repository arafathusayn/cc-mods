#!/usr/bin/env bun
// Scaffold a mod under mods/<name> and list it in .claude-plugin/marketplace.json.
//   bun run new <name> "<one-line description>"
import { mkdir, exists } from 'node:fs/promises'
import { join } from 'node:path'
import { $ } from 'bun'

import { MODS, ROOT, readMarketplace, writeMarketplace } from './lib'

const [name, description] = Bun.argv.slice(2)

if (!name || !description) {
  console.error('usage: bun run new <name> "<one-line description>"')
  process.exit(2)
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error(`name must be kebab-case (a-z, 0-9, -): ${name}`)
  process.exit(2)
}
// The prefixes and names `claude plugin validate` rejects for a plugin.
if (
  /^(claude|anthropic|anthropics|cc-plugin)(-|$)/.test(name) ||
  name === 'claude-mods'
) {
  console.error(`name is reserved: ${name}`)
  process.exit(2)
}

const dir = join(MODS, name)
if (await exists(dir)) {
  console.error(`already exists: mods/${name}`)
  process.exit(1)
}

const claudeVersion = (await $`claude --version`.nothrow().quiet().text())
  .trim()
  .split(' ')[0]

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const str = (value: string) => JSON.stringify(value)

const files: Record<string, string> = {
  '.claude-plugin/plugin.json': json({
    name,
    version: '0.1.0',
    description,
    author: { name: 'Arafat Husayn', url: 'https://github.com/arafathusayn' },
    repository: 'https://github.com/arafathusayn/cc-mods',
    license: 'MIT',
  }),

  'hooks/hooks.json': json({ modules: ['./register.tsx'] }),

  'hooks/register.tsx': `import type { Register } from 'claude-code'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: ${str(name)},
      description: ${str(description)},
    })

    return next(e)
  })

  on('command.run', { command: ${str(name)} }, async () => {
    return { text: ${str(`${name} is loaded.`)} }
  })
}
`,

  'tests/register.test.ts': `import { describe, expect, test } from 'claude-code/testing'

describe('register', () => {
  test(${str(`/${name} answers`)}, async $ => {
    // The engine's own $ takes the event's input whole, as typed at the prompt.
    const { text } = await $.command.run({
      command: ${str(name)},
      args: '',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
    expect(text).toBe(${str(`${name} is loaded.`)})
  })
})
`,

  // Present so the engine does not write its own tsconfig here on load; the
  // shared options live in mods/tsconfig.json.
  'tsconfig.json': json({
    extends: '../tsconfig.json',
    include: ['hooks', 'tests', 'types', '../*/types/**/*.d.ts'],
  }),

  'README.md': `# ${name}

${description}

## Install

\`\`\`bash
claude plugin marketplace add arafathusayn/cc-mods
claude plugin install ${name}@cc-mods
\`\`\`

## Develop

\`\`\`bash
claude --plugin-dir mods/${name}
\`\`\`

Tested with Claude Code ${claudeVersion || '<version>'}.
`,
}

for (const [path, content] of Object.entries(files)) {
  const target = join(dir, path)
  await mkdir(join(target, '..'), { recursive: true })
  await Bun.write(target, content)
}

const marketplace = await readMarketplace()
marketplace.plugins = [
  ...marketplace.plugins.filter(entry => entry.name !== name),
  { name, source: name, description },
].sort((a, b) => a.name.localeCompare(b.name))
await writeMarketplace(marketplace)

// Add the mod's row to the README's Mods table, keeping rows sorted.
const readme = join(ROOT, 'README.md')
const lines = (await Bun.file(readme).text()).split('\n')
const header = lines.indexOf('| Mod | What it does |')
if (header !== -1) {
  let end = header + 2
  while (lines[end]?.startsWith('|')) end += 1
  const rows = lines
    .slice(header + 2, end)
    .filter(row => !row.startsWith('| _none yet_'))
    .concat(`| [${name}](mods/${name}) | ${description.replaceAll('|', '\\|')} |`)
    .sort()
  lines.splice(header + 2, end - header - 2, ...rows)
  await Bun.write(readme, lines.join('\n'))
}

console.log(`created mods/${name} and listed it in .claude-plugin/marketplace.json`)
console.log(`next: claude --plugin-dir mods/${name}`)
