#!/usr/bin/env bun
// bun run sync-types: refresh mods/types/ from the installed Claude Code.
import { describeSyncTypesError, syncTypes } from '../app/sync-types'
import { exitWith, wire } from './wiring'

const synced = await syncTypes(wire())()
if (!synced.ok) exitWith(describeSyncTypesError(synced.error))
else console.log(`✔ mods/types: ${synced.value}`)
