#!/usr/bin/env bun
// bun run sync-kernel: mirror kernel/ into every mod's hooks/kernel/.
import { syncKernel } from '../app/sync-kernel'
import { describeIoError } from '../ports'
import { exitWith, wire } from './wiring'

const synced = await syncKernel(wire())()
if (!synced.ok) exitWith(describeIoError(synced.error))
else console.log(synced.value.length === 0 ? '✔ no mod carries a kernel' : `✔ kernel synced into ${synced.value.join(', ')}`)
