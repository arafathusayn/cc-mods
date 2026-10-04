import { describe, expect, test } from 'bun:test'

import { parseModDescription } from '../../scripts/domain/mod-description'
import { parseModName } from '../../scripts/domain/mod-name'

describe('mod name', () => {
  test.each(['token-meter', 'a', 'x2', 'blast-radius-2'])('accepts %p', name => {
    expect(parseModName(name).ok).toBe(true)
  })

  test.each([
    ['', 'is empty'],
    ['Token', 'must be kebab-case'],
    ['token--meter', 'must be kebab-case'],
    ['-token', 'must be kebab-case'],
    ['token-', 'must be kebab-case'],
    ['claude-meter', 'is reserved'],
    ['cc-plugin-x', 'is reserved'],
    ['claude-code', 'is reserved'],
    ['types', 'is reserved'],
    ['a'.repeat(65), 'is longer than'],
  ])('refuses %p', (name, reason) => {
    const parsed = parseModName(name)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error.reason).toContain(reason)
  })
})

describe('mod description', () => {
  test('trims and accepts one line', () => {
    expect(parseModDescription('  Shows the branch  ')).toEqual({ ok: true, value: 'Shows the branch' as never })
  })

  test.each([' ', 'two\nlines', 'x'.repeat(201)])('refuses %p', text => {
    expect(parseModDescription(text).ok).toBe(false)
  })
})
