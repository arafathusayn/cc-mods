#!/usr/bin/env bun
// bun run new <name> "<one-line description>"
import { relative } from 'node:path'

import { createMod, describeCreateModError } from '../app/create-mod'
import { exitWith, wire } from './wiring'

const [name, description, ...extra] = Bun.argv.slice(2)
if (name === undefined || description === undefined || extra.length > 0) {
  exitWith('usage: bun run new <name> "<one-line description>"', 2)
} else {
  const deps = wire()
  const created = await createMod(deps)({ name, description })
  if (!created.ok) exitWith(describeCreateModError(created.error))
  else {
    const dir = relative(deps.layout.root, created.value.dir)
    console.log(`✔ created ${dir} and listed ${created.value.name} in the marketplace and README`)
    for (const file of created.value.files) console.log(`  ${dir}/${file}`)
    console.log(`\nnext: claude --plugin-dir ${dir}`)
  }
}
