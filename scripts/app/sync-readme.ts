// Use case: render the README's mods section from the catalog, writing the
// README only when the section changed.
import { ok, type AsyncResult } from '../../kernel/result'
import type { Layout, Publisher } from '../config'
import { describeDocumentError, readDocument, type DocumentError } from '../domain/document'
import { decodeMarketplace } from '../domain/marketplace'
import { describeReadmeCatalogError, readmeFor, type ReadmeCatalogError } from '../domain/readme-catalog'
import { describeIoError, type FileReader, type FileWriter, type IoError } from '../ports'

export type SyncReadmeDeps = {
  readonly reader: FileReader
  readonly writer: FileWriter
  readonly layout: Layout
  readonly publisher: Publisher
}

export type SyncReadmeError = IoError | DocumentError | ReadmeCatalogError

/** Whether the README had to change to match the catalog. */
export type SyncReadmeOutcome = 'updated' | 'current'

export const syncReadme =
  (deps: SyncReadmeDeps) =>
  async (): AsyncResult<SyncReadmeOutcome, SyncReadmeError> => {
    const { reader, writer, layout, publisher } = deps
    const [marketplaceText, readmeText] = await Promise.all([
      reader.readText(layout.marketplaceFile),
      reader.readText(layout.readme),
    ])
    if (!marketplaceText.ok) return marketplaceText
    if (!readmeText.ok) return readmeText
    const marketplace = readDocument(marketplaceText.value, layout.marketplaceFile, decodeMarketplace)
    if (!marketplace.ok) return marketplace

    const readme = readmeFor(readmeText.value, {
      marketplace: marketplace.value,
      repository: publisher.repository.slug,
      modsDirName: layout.modsDirName,
    })
    if (!readme.ok) return readme
    if (readme.value === readmeText.value) return ok('current')

    const written = await writer.writeText(layout.readme, readme.value)
    return written.ok ? ok('updated') : written
  }

export const describeSyncReadmeError = (error: SyncReadmeError): string => {
  switch (error.kind) {
    case 'io/failed':
      return describeIoError(error)
    case 'readme/no-mods-section':
      return describeReadmeCatalogError(error)
    case 'document/syntax':
    case 'document/shape':
      return describeDocumentError(error)
  }
}
