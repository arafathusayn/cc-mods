import { describe, expect, test } from 'bun:test'

import {
  all,
  andThen,
  andThenAsync,
  attempt,
  attemptAsync,
  err,
  map,
  mapErr,
  match,
  ok,
  partition,
  unwrapOr,
} from '../../kernel/result'

describe('result', () => {
  test('map and mapErr touch only their own track', () => {
    expect(map(ok(2), n => n * 2)).toEqual(ok(4))
    expect(map(err('no'), (n: number) => n * 2)).toEqual(err('no'))
    expect(mapErr(err('no'), e => e.length)).toEqual(err(2))
    expect(mapErr(ok(1), (e: string) => e.length)).toEqual(ok(1))
  })

  test('andThen short-circuits on the first error', () => {
    let calls = 0
    const half = (n: number) => {
      calls += 1
      return n % 2 === 0 ? ok(n / 2) : err(`${n} is odd`)
    }
    expect(andThen(andThen(ok(8), half), half)).toEqual(ok(2))
    expect(andThen(andThen(ok(3), half), half)).toEqual(err('3 is odd'))
    expect(calls).toBe(3)
  })

  test('andThenAsync accepts a pending result and an async step', async () => {
    expect(await andThenAsync(Promise.resolve(ok(1)), async n => ok(n + 1))).toEqual(ok(2))
    expect(await andThenAsync(err('stop'), async (n: number) => ok(n + 1))).toEqual(err('stop'))
  })

  test('all keeps order and stops at the first error; partition keeps every error', () => {
    expect(all([ok(1), ok(2)])).toEqual(ok([1, 2]))
    expect(all([ok(1), err('a'), err('b')])).toEqual(err('a'))
    expect(partition([ok(1), err('a'), ok(2), err('b')])).toEqual({ values: [1, 2], errors: ['a', 'b'] })
  })

  test('attempt and attemptAsync put a throw on the error track', async () => {
    expect(attempt(() => JSON.parse('{'), () => 'bad json')).toEqual(err('bad json'))
    expect(attempt(() => 1, () => 'never')).toEqual(ok(1))
    expect(await attemptAsync(() => Promise.reject(new Error('x')), cause => (cause as Error).message)).toEqual(err('x'))
  })

  test('match and unwrapOr leave the railway', () => {
    expect(match(ok(1), { ok: n => `ok ${n}`, err: e => `err ${e}` })).toBe('ok 1')
    expect(match(err('x'), { ok: n => `ok ${n}`, err: e => `err ${e}` })).toBe('err x')
    expect(unwrapOr(err('x'), 0)).toBe(0)
  })
})
