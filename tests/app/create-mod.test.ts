import { describe, expect, test } from 'bun:test'

import { err, ok, unit } from '../../kernel/result'
import { createMod, describeCreateModError } from '../../scripts/app/create-mod'
import { layoutAt, PUBLISHER } from '../../scripts/config'
import type { FileReader, FileWriter, IoError } from '../../scripts/ports'

const layout = layoutAt('/repo')

const README = '# cc-mods\n\n## Mods\n\n| Mod | What it does |\n| --- | --- |\n| _none yet_ | |\n'
const CATALOG = '{"name":"cc-mods","owner":{"name":"A"},"metadata":{"pluginRoot":"./mods"},"plugins":[]}\n'

/** An in-memory filesystem: files by absolute path, folders implied by their files. */
const memoryFiles = (initial: Record<string, string>, failWritesTo: ReadonlySet<string> = new Set()) => {
  const files = new Map(Object.entries(initial))
  const missing = (path: string): IoError => ({ kind: 'io/failed', operation: 'read', path, message: 'ENOENT' })
  const hasFolder = (dir: string) => [...files.keys()].some(path => path.startsWith(`${dir}/`))

  const reader: FileReader = {
    readText: async path => {
      const text = files.get(path)
      return text === undefined ? err(missing(path)) : ok(text)
    },
    readTextIfPresent: async path => ok(files.get(path)),
    exists: async path => files.has(path) || hasFolder(path),
    glob: async (pattern, cwd) => {
      const matcher = new Bun.Glob(pattern)
      return ok(
        [...files.keys()]
          .filter(path => path.startsWith(`${cwd}/`))
          .map(path => path.slice(cwd.length + 1))
          .filter(path => matcher.match(path))
          .sort(),
      )
    },
  }

  const writer: FileWriter = {
    writeText: async (path, content) => {
      if (failWritesTo.has(path)) return err({ kind: 'io/failed', operation: 'write', path, message: 'disk full' })
      files.set(path, content)
      return unit
    },
    createTree: async (dir, tree) => {
      for (const [path, content] of tree) files.set(`${dir}/${path}`, content)
      return unit
    },
    replaceTree: async () => unit,
    remove: async target => {
      for (const path of [...files.keys()]) if (path === target || path.startsWith(`${target}/`)) files.delete(path)
      return unit
    },
    makeTempDir: async () => ok('/tmp/x'),
  }

  return { files, reader, writer }
}

const seed = {
  [layout.marketplaceFile]: CATALOG,
  [layout.readme]: README,
  [`${layout.kernelDir}/result.ts`]: '// result',
  [`${layout.kernelDir}/decode.ts`]: '// decode',
}

const claude = { version: async () => ok('2.1.289') }

describe('createMod', () => {
  test('scaffolds the mod, mirrors the kernel and lists it in the catalog and README', async () => {
    const fs = memoryFiles(seed)
    const created = await createMod({ ...fs, claude, layout, publisher: PUBLISHER })({
      name: 'token-meter',
      description: 'Shows token use',
    })

    expect(created.ok).toBe(true)
    expect(fs.files.get('/repo/mods/token-meter/hooks/kernel/decode.ts')).toBe('// decode')
    expect(JSON.parse(fs.files.get('/repo/mods/token-meter/.claude-plugin/plugin.json') ?? '')).toMatchObject({
      name: 'token-meter',
      version: '0.1.0',
    })
    expect(JSON.parse(fs.files.get(layout.marketplaceFile) ?? '').plugins).toEqual([
      { name: 'token-meter', source: 'token-meter', description: 'Shows token use' },
    ])
    expect(fs.files.get(layout.readme)).toContain('| [token-meter](mods/token-meter) | Shows token use |')
    expect(fs.files.get('/repo/mods/token-meter/README.md')).toContain('Tested with Claude Code 2.1.289.')
  })

  test('validates before writing anything', async () => {
    const fs = memoryFiles(seed)
    const before = new Map(fs.files)
    const created = await createMod({ ...fs, claude, layout, publisher: PUBLISHER })({ name: 'Bad Name', description: 'x' })

    expect(created.ok ? '' : describeCreateModError(created.error)).toContain('must be kebab-case')
    expect(fs.files).toEqual(before)
  })

  test('refuses a folder that already exists', async () => {
    const fs = memoryFiles({ ...seed, '/repo/mods/taken/README.md': '' })
    const created = await createMod({ ...fs, claude, layout, publisher: PUBLISHER })({ name: 'taken', description: 'x' })
    expect(created.ok ? '' : describeCreateModError(created.error)).toBe('/repo/mods/taken already exists')
  })

  test('undoes the earlier writes when a later one fails', async () => {
    const fs = memoryFiles(seed, new Set([layout.readme]))
    const before = new Map(fs.files)
    const created = await createMod({ ...fs, claude, layout, publisher: PUBLISHER })({ name: 'token-meter', description: 'x' })

    expect(created.ok ? '' : describeCreateModError(created.error)).toContain('disk full')
    expect(fs.files).toEqual(before)
  })
})
