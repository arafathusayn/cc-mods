import { join, resolve } from 'node:path'

export const ROOT = resolve(import.meta.dir, '..')
export const MODS = join(ROOT, 'mods')
export const MARKETPLACE = join(ROOT, '.claude-plugin', 'marketplace.json')

export type MarketplaceEntry = {
  name: string
  source: string
  description: string
  [field: string]: unknown
}

export type Marketplace = {
  name: string
  plugins: MarketplaceEntry[]
  [field: string]: unknown
}

export type PluginManifest = {
  name: string
  version?: string
  description?: string
  [field: string]: unknown
}

export const readMarketplace = async (): Promise<Marketplace> =>
  Bun.file(MARKETPLACE).json()

export const writeMarketplace = (marketplace: Marketplace) =>
  Bun.write(MARKETPLACE, `${JSON.stringify(marketplace, null, 2)}\n`)

export const readManifest = async (mod: string): Promise<PluginManifest> =>
  Bun.file(join(MODS, mod, '.claude-plugin', 'plugin.json')).json()

/** Every folder under mods/ that holds a plugin manifest. */
export const listModDirs = async (): Promise<string[]> => {
  const glob = new Bun.Glob('*/.claude-plugin/plugin.json')
  const dirs: string[] = []
  for await (const path of glob.scan({ cwd: MODS, dot: true })) {
    dirs.push(path.split('/')[0]!)
  }
  return dirs.sort()
}

/** Runs a command with inherited output and returns its exit code. */
export const run = async (cmd: string[], cwd = ROOT): Promise<number> => {
  const proc = Bun.spawn(cmd, { cwd, stdout: 'inherit', stderr: 'inherit' })
  return proc.exited
}
