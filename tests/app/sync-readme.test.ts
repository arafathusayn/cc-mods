import { describe, expect, test } from 'bun:test'

import { err, ok, unit } from '../../kernel/result'
import { describeSyncReadmeError, syncReadme } from '../../scripts/app/sync-readme'
import { layoutAt, PUBLISHER } from '../../scripts/config'
import type { FileReader, FileWriter } from '../../scripts/ports'

const layout = layoutAt('/repo')

const CATALOG = JSON.stringify({
  name: 'cc-mods',
  owner: { name: 'A' },
  metadata: { pluginRoot: './mods' },
  plugins: [{ name: 'token-meter', source: 'token-meter', description: 'Shows token use' }],
})

/** Files by path; every write counted. */
const memoryFiles = (initial: Record<string, string>) => {
  const files = new Map(Object.entries(initial))
  let writes = 0
  const reader: Pick<FileReader, 'readText'> = {
    readText: async path => {
      const text = files.get(path)
      return text === undefined ? err({ kind: 'io/failed', operation: 'read', path, message: 'ENOENT' }) : ok(text)
    },
  }
  const writer: Pick<FileWriter, 'writeText'> = {
    writeText: async (path, content) => {
      writes += 1
      files.set(path, content)
      return unit
    },
  }
  return { files, writes: () => writes, reader: reader as FileReader, writer: writer as FileWriter }
}

describe('syncReadme', () => {
  test('renders the mods section from the catalog, then finds it current and writes nothing', async () => {
    const fs = memoryFiles({
      [layout.marketplaceFile]: CATALOG,
      [layout.readme]: '# cc-mods\n\n## Mods\n\nanything stale\n\n## License\n',
    })
    const sync = syncReadme({ ...fs, layout, publisher: PUBLISHER })

    expect(await sync()).toEqual(ok('updated'))
    const readme = fs.files.get(layout.readme) ?? ''
    expect(readme).toContain('### token-meter\n')
    expect(readme).toContain('[Read the token-meter guide](mods/token-meter/README.md)')
    expect(readme).toContain(`claude plugin marketplace add ${PUBLISHER.repository.slug}`)
    expect(readme).toEndWith('claude plugin uninstall token-meter@cc-mods\n```\n\n</details>\n\n## License\n')
    expect(readme).not.toContain('anything stale')

    expect(await sync()).toEqual(ok('current'))
    expect(fs.writes()).toBe(1)
  })

  test('refuses a README without the markers, writing nothing', async () => {
    const fs = memoryFiles({ [layout.marketplaceFile]: CATALOG, [layout.readme]: '# cc-mods\n' })
    const synced = await syncReadme({ ...fs, layout, publisher: PUBLISHER })()
    expect(synced.ok ? '' : describeSyncReadmeError(synced.error)).toStartWith('README.md has no mods section')
    expect(fs.writes()).toBe(0)
  })
})
