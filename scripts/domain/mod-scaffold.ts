// The files a new mod starts with. Pure: paths relative to the mod's folder,
// mapped to their content.
import { encodeDocument } from './document'
import type { ModDescription } from './mod-description'
import type { ModName } from './mod-name'
import { newPluginManifest, type Author } from './plugin-manifest'

export type ModScaffoldInput = {
  readonly name: ModName
  readonly description: ModDescription
  readonly author: Author
  readonly repository: { readonly slug: string; readonly url: string }
  readonly license: string
  readonly marketplaceName: string
  /** The canonical kernel/ files by name, mirrored into the mod. */
  readonly kernel: ReadonlyMap<string, string>
  /** The Claude Code version the mod was scaffolded under, for its README. */
  readonly claudeVersion: string
}

export const MOD_KERNEL_DIR = 'hooks/kernel'

const literal = (text: string): string => JSON.stringify(text)

export const scaffoldMod = (input: ModScaffoldInput): ReadonlyMap<string, string> => {
  const { name, description } = input
  const loaded = `${name} is loaded.`

  return new Map([
    [
      '.claude-plugin/plugin.json',
      encodeDocument(
        newPluginManifest({
          name,
          description,
          author: input.author,
          repositoryUrl: input.repository.url,
          license: input.license,
        }),
      ),
    ],
    ['hooks/hooks.json', encodeDocument({ modules: ['./register.tsx'] })],
    [
      'hooks/register.tsx',
      `import type { Register } from 'claude-code'

// The composition root: it wires events to the mod's domain and holds no logic.
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: ${literal(name)},
      description: ${literal(description)},
    })

    return next(e)
  })

  on('command.run', { command: ${literal(name)} }, async () => ({ text: ${literal(loaded)} }))
}
`,
    ],
    ...Array.from(input.kernel, ([file, content]): [string, string] => [`${MOD_KERNEL_DIR}/${file}`, content]),
    [
      'tests/register.test.ts',
      `import { describe, expect, test } from 'claude-code/testing'

describe('register', () => {
  test(${literal(`/${name} answers`)}, async $ => {
    // The engine's own $ takes an event's input whole, as the prompt would pass it.
    const { text } = await $.command.run({
      command: ${literal(name)},
      args: '',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })

    expect(text).toBe(${literal(loaded)})
  })
})
`,
    ],
    // Present so the engine does not write a tsconfig of its own on load;
    // the shared options live in mods/tsconfig.json.
    ['tsconfig.json', encodeDocument({ extends: '../tsconfig.json', include: ['hooks', 'tests', 'types', '../*/types/**/*.d.ts'] })],
    [
      'README.md',
      `# ${name}

${description}

## Install

\`\`\`bash
claude plugin marketplace add ${input.repository.slug}
claude plugin install ${name}@${input.marketplaceName}
\`\`\`

## Develop

\`\`\`bash
claude --plugin-dir mods/${name}
\`\`\`

Tested with Claude Code ${input.claudeVersion}.
`,
    ],
  ])
}
