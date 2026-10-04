import { describe, expect, test } from 'bun:test'

import { parseCommitMessage } from '../../scripts/domain/commit-message'

const reason = (message: string): string => {
  const parsed = parseCommitMessage(message)
  return parsed.ok ? 'ok' : parsed.error.reason
}

describe('commit message', () => {
  test('parses type, scope, breaking mark and subject', () => {
    expect(parseCommitMessage('feat(token-meter)!: show cache hits\n\nBody.\n\nBREAKING CHANGE: x')).toEqual({
      ok: true,
      value: { type: 'feat', scope: 'token-meter', isBreaking: true, subject: 'show cache hits' },
    })
    expect(reason('fix: handle an empty catalog')).toBe('ok')
  })

  test('ignores comment lines and the scissors tail git adds', () => {
    expect(reason('docs: explain releases\n# Please enter the commit message\n')).toBe('ok')
    expect(reason('chore: x\n# ------------------------ >8 ------------------------\ndiff --git a b')).toBe('ok')
  })

  test('lets git and autosquash messages through', () => {
    expect(reason("Merge branch 'main'")).toBe('ok')
    expect(reason('fixup! feat: x')).toBe('ok')
  })

  test.each([
    ['', 'the message is empty'],
    ['Scaffold the repository', 'the header must read'],
    ['feature: x', '"feature" is not a type'],
    ['feat(Token Meter): x', 'must be kebab-case'],
    ['feat: Add a pane', 'start the subject in lower case'],
    ['feat: add a pane.', 'end the subject without a period'],
    [`feat: ${'x'.repeat(80)}`, 'keep it to 72'],
    ['feat: x\nbody without a blank line', 'leave one blank line'],
  ])('refuses %p', (message, expected) => {
    expect(reason(message)).toContain(expected)
  })
})
