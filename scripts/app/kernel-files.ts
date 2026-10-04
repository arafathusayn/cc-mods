// Reading the shared kernel: the canonical kernel/ and a mod's hooks/kernel/ mirror.
import { join } from 'node:path'

import { all, map, ok, type AsyncResult } from '../../kernel/result'
import type { Layout } from '../config'
import { MOD_KERNEL_DIR } from '../domain/mod-scaffold'
import type { FileReader, IoError } from '../ports'

const KERNEL_FILES = '*.ts'

const readFolder = async (reader: FileReader, dir: string): AsyncResult<ReadonlyMap<string, string>, IoError> => {
  const files = await reader.glob(KERNEL_FILES, dir)
  if (!files.ok) return files
  const contents = all(await Promise.all(files.value.map(file => reader.readText(join(dir, file)))))
  return map(contents, texts => new Map(files.value.map((file, index) => [file, texts[index] ?? ''])))
}

/** kernel/*.ts by file name. */
export const readKernel = (reader: FileReader, layout: Layout): AsyncResult<ReadonlyMap<string, string>, IoError> =>
  readFolder(reader, layout.kernelDir)

/** A mod's hooks/kernel/*.ts by file name, or undefined when it carries no kernel. */
export const readModKernel = async (
  reader: FileReader,
  modDir: string,
): AsyncResult<ReadonlyMap<string, string> | undefined, IoError> => {
  const dir = join(modDir, MOD_KERNEL_DIR)
  if (!(await reader.exists(dir))) return ok(undefined)
  return readFolder(reader, dir)
}
