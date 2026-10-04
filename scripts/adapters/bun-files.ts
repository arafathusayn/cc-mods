// FileReader and FileWriter over Bun and node:fs. Every write lands through a
// rename on the same filesystem, so a crash leaves the old state or the new.
import { cp, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'

import { attemptAsync, describeCause, err, ok, unit } from '../../kernel/result'
import type { FileReader, FileWriter, IoError } from '../ports'

const ioError =
  (operation: string, path: string) =>
  (cause: unknown): IoError => ({ kind: 'io/failed', operation, path, message: describeCause(cause) })

const isMissing = (cause: unknown): boolean =>
  typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'ENOENT'

/** A sibling path for staging, so the final rename never crosses filesystems. */
const stagingPath = (path: string): string =>
  join(dirname(path), `.${basename(path)}.staging-${crypto.randomUUID()}`)

export const bunFileReader: FileReader = {
  readText: path => attemptAsync(() => Bun.file(path).text(), ioError('read', path)),

  readTextIfPresent: async path => {
    try {
      return ok(await Bun.file(path).text())
    } catch (cause) {
      return isMissing(cause) ? ok(undefined) : err(ioError('read', path)(cause))
    }
  },

  exists: async path => {
    try {
      await stat(path)
      return true
    } catch {
      return false
    }
  },

  glob: (pattern, cwd) =>
    attemptAsync(async () => {
      const paths = await Array.fromAsync(new Bun.Glob(pattern).scan({ cwd, dot: true, onlyFiles: true }))
      return paths.sort()
    }, ioError('list', join(cwd, pattern))),
}

export const bunFileWriter: FileWriter = {
  writeText: async (path, content) => {
    const staging = stagingPath(path)
    try {
      await Bun.write(staging, content)
      await rename(staging, path)
      return unit
    } catch (cause) {
      await rm(staging, { force: true })
      return err(ioError('write', path)(cause))
    }
  },

  createTree: async (dir, files) => {
    const staging = stagingPath(dir)
    try {
      await mkdir(staging, { recursive: true })
      await Promise.all(
        Array.from(files, async ([relative, content]) => {
          const target = join(staging, relative)
          await mkdir(dirname(target), { recursive: true })
          await Bun.write(target, content)
        }),
      )
      // A rename onto an existing empty folder would succeed; refuse it explicitly.
      if (await bunFileReader.exists(dir)) throw new Error('it already exists')
      await rename(staging, dir)
      return unit
    } catch (cause) {
      await rm(staging, { recursive: true, force: true })
      return err(ioError('create', dir)(cause))
    }
  },

  replaceTree: async (target, source) => {
    const staging = stagingPath(target)
    const previous = stagingPath(target)
    try {
      await cp(source, staging, { recursive: true })
      const hadPrevious = await bunFileReader.exists(target)
      if (hadPrevious) await rename(target, previous)
      try {
        await rename(staging, target)
      } catch (cause) {
        if (hadPrevious) await rename(previous, target)
        throw cause
      }
      await rm(previous, { recursive: true, force: true })
      return unit
    } catch (cause) {
      await rm(staging, { recursive: true, force: true })
      return err(ioError('replace', target)(cause))
    }
  },

  remove: path => attemptAsync(async () => {
    await rm(path, { recursive: true, force: true })
    return undefined
  }, ioError('remove', path)),

  makeTempDir: prefix => attemptAsync(() => mkdtemp(join(tmpdir(), prefix)), ioError('create a folder in', tmpdir())),
}
