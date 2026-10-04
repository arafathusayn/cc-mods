// Use case: refresh mods/types/ with the mod API declarations of the
// installed Claude Code. The engine writes them beside any mod it loads, so
// this loads a throwaway mod headlessly (its command answers without a model
// turn) and swaps the written type roots into mods/types/.
import { join } from 'node:path'

import { err, ok, type AsyncResult } from '../../kernel/result'
import { SHARED_TYPE_ROOTS, type Layout } from '../config'
import { encodeDocument } from '../domain/document'
import {
  describeIoError,
  describeProcessError,
  type ClaudeCli,
  type FileReader,
  type FileWriter,
  type IoError,
  type ProcessError,
} from '../ports'

export type SyncTypesDeps = {
  readonly reader: FileReader
  readonly writer: FileWriter
  readonly claude: Pick<ClaudeCli, 'runCommand'>
  readonly layout: Layout
}

export type SyncTypesError =
  | IoError
  | ProcessError
  | { readonly kind: 'sync-types/probe-failed'; readonly output: string }
  | { readonly kind: 'sync-types/no-types'; readonly root: string }

const PROBE = 'types-probe'

const probeFiles: ReadonlyMap<string, string> = new Map([
  ['.claude-plugin/plugin.json', encodeDocument({ name: PROBE, version: '0.0.0', description: 'Writes the mod API types' })],
  ['hooks/hooks.json', encodeDocument({ modules: ['./register.ts'] })],
  [
    'hooks/register.ts',
    `export const register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: '${PROBE}', description: 'Writes the mod API types' })
    return next(e)
  })
  on('command.run', { command: '${PROBE}' }, async () => ({ text: 'ok' }))
}
`,
  ],
])

/** The version line the engine wrote atop the declarations, such as "Written by Claude Code 2.1.289." */
export const syncTypes =
  (deps: SyncTypesDeps) =>
  async (): AsyncResult<string, SyncTypesError> => {
    const { reader, writer, claude, layout } = deps
    const temp = await writer.makeTempDir('cc-mods-types-')
    if (!temp.ok) return temp
    const probe = join(temp.value, PROBE)

    try {
      const created = await writer.createTree(probe, probeFiles)
      if (!created.ok) return created

      const ran = await claude.runCommand(PROBE, probe)
      if (!ran.ok) return ran
      if (ran.value.exitCode !== 0) return err({ kind: 'sync-types/probe-failed', output: ran.value.output })

      const written = join(probe, '.claude-plugin', 'types')
      for (const root of SHARED_TYPE_ROOTS) {
        if (!(await reader.exists(join(written, root, 'index.d.ts')))) return err({ kind: 'sync-types/no-types', root })
      }
      for (const root of SHARED_TYPE_ROOTS) {
        const replaced = await writer.replaceTree(join(layout.sharedTypesDir, root), join(written, root))
        if (!replaced.ok) return replaced
      }

      const declarations = await reader.readText(join(layout.sharedTypesDir, 'claude-code', 'index.d.ts'))
      if (!declarations.ok) return declarations
      return ok(declarations.value.slice(0, declarations.value.indexOf('\n')).replace(/^\/\/\s*/, ''))
    } finally {
      await writer.remove(temp.value)
    }
  }

export const describeSyncTypesError = (error: SyncTypesError): string => {
  switch (error.kind) {
    case 'io/failed':
      return describeIoError(error)
    case 'process/spawn-failed':
      return describeProcessError(error)
    case 'sync-types/probe-failed':
      return `claude could not load the probe mod:\n${error.output}`
    case 'sync-types/no-types':
      return `claude loaded the probe mod but wrote no ${error.root} types; is mods support on (claude --version >= 2.1.287)?`
  }
}
