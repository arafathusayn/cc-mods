// Use case: mirror kernel/ into every mod that carries a hooks/kernel/.
import { join } from 'node:path'

import { ok, type AsyncResult } from '../../kernel/result'
import type { Layout } from '../config'
import { MOD_KERNEL_DIR } from '../domain/mod-scaffold'
import type { FileReader, FileWriter, IoError } from '../ports'
import { discoverMods } from './mod-discovery'

export type SyncKernelDeps = { readonly reader: FileReader; readonly writer: FileWriter; readonly layout: Layout }

/** The mods whose hooks/kernel/ was replaced with a copy of kernel/. */
export const syncKernel =
  (deps: SyncKernelDeps) =>
  async (): AsyncResult<string[], IoError> => {
    const { reader, writer, layout } = deps
    const folders = await discoverMods(reader, layout)
    if (!folders.ok) return folders

    const synced: string[] = []
    for (const folder of folders.value) {
      const target = join(layout.modsDir, folder, MOD_KERNEL_DIR)
      if (!(await reader.exists(target))) continue
      const replaced = await writer.replaceTree(target, layout.kernelDir)
      if (!replaced.ok) return replaced
      synced.push(folder)
    }
    return ok(synced)
  }
