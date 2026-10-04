// Which folders under mods/ are mods.
import { map, type AsyncResult } from '../../kernel/result'
import type { Layout } from '../config'
import type { FileReader, IoError } from '../ports'

/** Folders under mods/ holding a plugin manifest, staging folders (dot-named) excluded. Sorted. */
export const discoverMods = async (reader: FileReader, layout: Layout): AsyncResult<string[], IoError> =>
  map(await reader.glob('*/.claude-plugin/plugin.json', layout.modsDir), manifests =>
    manifests.map(path => path.slice(0, path.indexOf('/'))).filter(folder => !folder.startsWith('.')),
  )
