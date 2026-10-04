import { describe, expect, test } from 'bun:test'

import {
  array,
  boolean,
  describeDecodeError,
  integer,
  literal,
  nullable,
  number,
  object,
  oneOf,
  optional,
  record,
  refine,
  string,
  transform,
  type DecodeError,
} from '../../kernel/decode'
import { err, ok, type Result } from '../../kernel/result'

const failure = (result: Result<unknown, DecodeError>): string =>
  result.ok ? 'decoded' : describeDecodeError(result.error)

describe('decode', () => {
  test('primitives accept exactly their type', () => {
    expect(string('a')).toEqual(ok('a'))
    expect(failure(string(1))).toBe('$ must be a string (got number)')
    expect(boolean(false)).toEqual(ok(false))
    expect(failure(number(Number.NaN))).toBe('$ must be a finite number (got number)')
    expect(failure(integer(1.5))).toBe('$ must be an integer (got number)')
    expect(failure(literal('a', 'b')('c'))).toBe('$ must be one of "a", "b" (got string)')
  })

  test('object decodes its fields, drops the others and omits absent optionals', () => {
    const user = object({ name: string, age: optional(integer), tags: array(string) })
    expect(user({ name: 'a', tags: ['x'], extra: true })).toEqual(ok({ name: 'a', tags: ['x'] }))
    expect(failure(user({ name: 'a', tags: ['x', 2] }))).toBe('$.tags[1] must be a string (got number)')
    expect(failure(user(null))).toBe('$ must be an object (got null)')
    expect(failure(user([]))).toBe('$ must be an object (got array)')
  })

  test('errors carry the full path through nested decoders', () => {
    const doc = object({ plugins: array(object({ 'odd key': record(nullable(number)) })) })
    expect(failure(doc({ plugins: [{ 'odd key': { a: 1, b: null } }, { 'odd key': { c: 'x' } }] }))).toBe(
      '$.plugins[1]["odd key"].c must be a finite number (got string)',
    )
  })

  test('refine, transform and oneOf narrow and convert', () => {
    const port = refine(integer, n => n > 0 && n < 65536, 'a port number')
    expect(port(8080)).toEqual(ok(8080))
    expect(failure(port(0))).toBe('$ must be a port number (got number)')

    const date = transform(string, text => (Number.isNaN(Date.parse(text)) ? err('an ISO date') : ok(new Date(text))))
    expect(failure(date('soon'))).toBe('$ must be an ISO date (got string)')

    const id = oneOf('a string or a number', string, number)
    expect(id(3)).toEqual(ok(3))
    expect(failure(id(true))).toBe('$ must be a string or a number (got boolean)')
  })
})
