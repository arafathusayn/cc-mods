import { describe, expect, test } from 'bun:test'

import { InvariantError, invariant } from '../../kernel/invariant'

describe('invariant', () => {
  test('passes silently and throws an InvariantError when broken', () => {
    expect(() => invariant(true, 'never')).not.toThrow()
    expect(() => invariant(0, 'count must be positive')).toThrow(InvariantError)
  })

  test('builds a lazy message only on failure', () => {
    let built = 0
    const message = () => {
      built += 1
      return 'broken'
    }
    invariant(true, message)
    expect(built).toBe(0)
    expect(() => invariant(false, message)).toThrow('broken')
    expect(built).toBe(1)
  })
})
