#!/usr/bin/env bun
// Refresh mods/types/ with the mod API declarations of the installed Claude Code.
// The engine writes them beside any mod it loads, so this loads a throwaway mod
// headlessly (its command answers without a model turn) and copies them out.
//   bun run sync-types
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { $ } from 'bun'

import { MODS } from './lib'

// claude-code-mcp is left out: it lists whatever MCP tools the probe session had.
const TYPE_ROOTS = ['claude-code', 'claude-code-tools']

const probe = await mkdtemp(join(tmpdir(), 'cc-mods-types-'))
try {
  await Bun.write(
    join(probe, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'types-probe', version: '0.0.0', description: 'Writes the mod API types' }),
  )
  await Bun.write(join(probe, 'hooks', 'hooks.json'), JSON.stringify({ modules: ['./register.ts'] }))
  await Bun.write(
    join(probe, 'hooks', 'register.ts'),
    `export const register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'types-probe', description: 'Writes the mod API types' })
    return next(e)
  })
  on('command.run', { command: 'types-probe' }, async () => ({ text: 'ok' }))
}
`,
  )

  await $`claude -p /types-probe --plugin-dir ${probe}`.quiet()

  for (const root of TYPE_ROOTS) {
    const from = join(probe, '.claude-plugin', 'types', root)
    const to = join(MODS, 'types', root)
    await rm(to, { recursive: true, force: true })
    await cp(from, to, { recursive: true })
  }

  const header = (await Bun.file(join(MODS, 'types', 'claude-code', 'index.d.ts')).text()).split('\n')[0]
  console.log(`mods/types: ${header?.replace(/^\/\/\s*/, '')}`)
} finally {
  await rm(probe, { recursive: true, force: true })
}
