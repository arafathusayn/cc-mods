// Where things live in this repository, and who publishes it.
import { join, resolve } from 'node:path'

import type { Author } from './domain/plugin-manifest'

export type Layout = {
  readonly root: string
  readonly marketplaceFile: string
  readonly readme: string
  /** kernel/: the shared kernel every mod mirrors at hooks/kernel/. */
  readonly kernelDir: string
  /** mods/, relative to the root as marketplace sources spell it. */
  readonly modsDirName: string
  readonly modsDir: string
  readonly sharedTypesDir: string
  readonly modsTsconfig: string
  readonly scriptsTsconfig: string
  readonly scriptsDir: string
  /** Unit tests of kernel/ and scripts/; kept out of kernel/ so mods never mirror them. */
  readonly unitTestsDir: string
}

export const layoutAt = (root: string): Layout => ({
  root,
  marketplaceFile: join(root, '.claude-plugin', 'marketplace.json'),
  readme: join(root, 'README.md'),
  kernelDir: join(root, 'kernel'),
  modsDirName: 'mods',
  modsDir: join(root, 'mods'),
  sharedTypesDir: join(root, 'mods', 'types'),
  modsTsconfig: join(root, 'mods', 'tsconfig.json'),
  scriptsTsconfig: join(root, 'tsconfig.json'),
  scriptsDir: join(root, 'scripts'),
  unitTestsDir: join(root, 'tests'),
})

export const repositoryLayout = (): Layout => layoutAt(resolve(import.meta.dir, '..'))

export type Publisher = {
  readonly author: Author
  readonly repository: { readonly slug: string; readonly url: string }
  readonly license: string
}

export const PUBLISHER: Publisher = {
  author: { name: 'Arafat Husayn', url: 'https://github.com/arafathusayn' },
  repository: { slug: 'arafathusayn/cc-mods', url: 'https://github.com/arafathusayn/cc-mods' },
  license: 'AGPL-3.0-only',
}

/**
 * The type roots the engine writes beside a loaded mod that mods/types keeps.
 * claude-code-mcp is left out: it lists whichever MCP tools happened to be connected.
 */
export const SHARED_TYPE_ROOTS = ['claude-code', 'claude-code-tools'] as const
