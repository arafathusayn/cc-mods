#!/usr/bin/env bun
// bun run sync-readme: render the README's mods section from the catalog.
import { describeSyncReadmeError, syncReadme } from '../app/sync-readme'
import { exitWith, wire } from './wiring'

const synced = await syncReadme(wire())()
if (!synced.ok) exitWith(describeSyncReadmeError(synced.error))
else console.log(synced.value === 'updated' ? '✔ README.md mods section updated' : '✔ README.md mods section already current')
