#!/usr/bin/env bun
// Everything CI runs: the marketplace and every mod validated, every mod's tests,
// and the type check. Pass mod names to check only those mods.
//   bun run check [mod...]
import { exists } from 'node:fs/promises'
import { join } from 'node:path'

import { MODS, ROOT, listModDirs, readManifest, readMarketplace, run } from './lib'

const failures: string[] = []
const fail = (message: string) => {
  failures.push(message)
  console.error(`✘ ${message}`)
}
const step = (title: string) => console.log(`\n── ${title}`)

const marketplace = await readMarketplace()
const dirs = await listModDirs()
const only = Bun.argv.slice(2)
const mods = only.length > 0 ? only : dirs

step('marketplace')
// An empty marketplace only warns, which --strict would fail on.
const strict = marketplace.plugins.length > 0 ? ['--strict'] : []
if ((await run(['claude', 'plugin', 'validate', ...strict, ROOT])) !== 0) {
  fail('marketplace does not validate')
}

const listed = new Map(marketplace.plugins.map(entry => [entry.name, entry]))
for (const dir of dirs) {
  const entry = listed.get(dir)
  if (!entry) {
    fail(`mods/${dir} is not listed in .claude-plugin/marketplace.json (bun run new adds it)`)
  } else if (entry.source !== dir && entry.source !== `./mods/${dir}`) {
    fail(`marketplace entry ${dir} has source ${entry.source}, expected ${dir}`)
  }
  const manifest = await readManifest(dir)
  if (manifest.name !== dir) {
    fail(`mods/${dir}/.claude-plugin/plugin.json is named ${manifest.name}; folder, manifest and entry names must agree`)
  }
  if (entry?.version !== undefined) {
    fail(`marketplace entry ${dir} sets version; keep it in plugin.json alone`)
  }
}
for (const name of listed.keys()) {
  if (!dirs.includes(name)) fail(`marketplace lists ${name} but mods/${name} has no plugin`)
}

for (const mod of mods) {
  const dir = join(MODS, mod)
  step(mod)
  if ((await run(['claude', 'plugin', 'validate', '--strict', dir])) !== 0) {
    fail(`${mod} does not validate`)
  }
  const tests = Array.from(new Bun.Glob('**/*.test.{ts,tsx}').scanSync({ cwd: dir }))
  if (tests.length === 0) {
    console.log(`(no tests in mods/${mod})`)
  } else if ((await run(['claude', 'plugin', 'test', dir])) !== 0) {
    fail(`${mod} tests fail`)
  }
}

step('typecheck')
if (dirs.length === 0) {
  console.log('(no mods yet)')
} else if (!(await exists(join(MODS, 'types', 'claude-code')))) {
  fail('mods/types/claude-code is missing (bun run sync-types writes it)')
} else if ((await run(['bunx', 'tsc', '-p', join(MODS, 'tsconfig.json')])) !== 0) {
  fail('mods do not type-check')
}
if ((await run(['bunx', 'tsc', '-p', join(ROOT, 'tsconfig.json')])) !== 0) {
  fail('scripts do not type-check')
}

console.log(failures.length === 0 ? '\n✔ all checks passed' : `\n✘ ${failures.length} check(s) failed`)
process.exit(failures.length === 0 ? 0 : 1)
