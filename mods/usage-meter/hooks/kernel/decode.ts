// Runtime decoding at trust boundaries: parse, don't validate.
//
// Anything that crosses into the program untyped (JSON from disk, $.store,
// $.fs, process output, a model's text, the network, userConfig options) goes
// through a decoder once, at the edge. What comes out is typed, and branded
// types carry that proof inward, so the domain never checks the same thing twice.
//
// Cost: decoders are plain closures built once at module load. The success
// path allocates nothing but the decoded value; the path to a failure is
// assembled only while the error unwinds.
//
// Canonical copy: kernel/decode.ts; every mod mirrors it at hooks/kernel/decode.ts.
import { err, ok, type Result } from './result'

export type DecodeError = {
  readonly kind: 'decode/invalid'
  /** Keys and indexes from the root to the offending value. */
  readonly path: readonly (string | number)[]
  readonly expected: string
  readonly received: string
}

export type Decoder<T> = (value: unknown) => Result<T, DecodeError>
export type Decoded<D> = D extends Decoder<infer T> ? T : never

const typeOf = (value: unknown): string =>
  value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value

const fail = (expected: string, value: unknown): Result<never, DecodeError> =>
  err({ kind: 'decode/invalid', path: [], expected, received: typeOf(value) })

const at = (key: string | number, error: DecodeError): DecodeError => ({ ...error, path: [key, ...error.path] })

export const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const unknown: Decoder<unknown> = value => ok(value)

export const string: Decoder<string> = value => (typeof value === 'string' ? ok(value) : fail('a string', value))

export const boolean: Decoder<boolean> = value => (typeof value === 'boolean' ? ok(value) : fail('a boolean', value))

/** A finite number: NaN and the infinities are refused. */
export const number: Decoder<number> = value =>
  typeof value === 'number' && Number.isFinite(value) ? ok(value) : fail('a finite number', value)

export const integer: Decoder<number> = value =>
  Number.isSafeInteger(value) ? ok(value as number) : fail('an integer', value)

export const literal = <const L extends readonly (string | number | boolean | null)[]>(
  ...values: L
): Decoder<L[number]> => {
  const allowed: ReadonlySet<unknown> = new Set(values)
  const expected = `one of ${values.map(value => JSON.stringify(value)).join(', ')}`
  return value => (allowed.has(value) ? ok(value as L[number]) : fail(expected, value))
}

export const optional =
  <T>(decoder: Decoder<T>): Decoder<T | undefined> =>
  value =>
    value === undefined ? ok(undefined) : decoder(value)

export const nullable =
  <T>(decoder: Decoder<T>): Decoder<T | null> =>
  value =>
    value === null ? ok(null) : decoder(value)

export const array =
  <T>(item: Decoder<T>): Decoder<T[]> =>
  value => {
    if (!Array.isArray(value)) return fail('an array', value)
    const items = new Array<T>(value.length)
    for (let index = 0; index < value.length; index += 1) {
      const decoded = item(value[index])
      if (!decoded.ok) return err(at(index, decoded.error))
      items[index] = decoded.value
    }
    return ok(items)
  }

/** A string-keyed map whose every value decodes. */
export const record =
  <T>(item: Decoder<T>): Decoder<Record<string, T>> =>
  value => {
    if (!isPlainObject(value)) return fail('an object', value)
    const entries: Record<string, T> = {}
    for (const key of Object.keys(value)) {
      const decoded = item(value[key])
      if (!decoded.ok) return err(at(key, decoded.error))
      entries[key] = decoded.value
    }
    return ok(entries)
  }

type Shape = Readonly<Record<string, Decoder<unknown>>>
type OptionalKeys<S extends Shape> = {
  [K in keyof S]: undefined extends Decoded<S[K]> ? K : never
}[keyof S]
export type ObjectOf<S extends Shape> = {
  readonly [K in Exclude<keyof S, OptionalKeys<S>>]: Decoded<S[K]>
} & { readonly [K in OptionalKeys<S>]?: Decoded<S[K]> }

/**
 * An object with the shape's fields, decoded; fields the shape does not name
 * are dropped from the result (the input is left as it was).
 */
export const object = <S extends Shape>(shape: S): Decoder<ObjectOf<S>> => {
  const keys = Object.keys(shape)
  return value => {
    if (!isPlainObject(value)) return fail('an object', value)
    const decoded: Record<string, unknown> = {}
    for (const key of keys) {
      const field = (shape[key] as Decoder<unknown>)(value[key])
      if (!field.ok) return err(at(key, field.error))
      if (field.value !== undefined) decoded[key] = field.value
    }
    return ok(decoded as ObjectOf<S>)
  }
}

/** The first decoder that accepts the value. */
export const oneOf = <const D extends readonly Decoder<unknown>[]>(
  expected: string,
  ...decoders: D
): Decoder<Decoded<D[number]>> =>
  value => {
    for (const decoder of decoders) {
      const decoded = decoder(value)
      if (decoded.ok) return decoded as Result<Decoded<D[number]>, DecodeError>
    }
    return fail(expected, value)
  }

/** Narrows a decoded value by a predicate, such as a range or a pattern. */
export const refine =
  <T, U extends T = T>(decoder: Decoder<T>, check: ((value: T) => value is U) | ((value: T) => boolean), expected: string): Decoder<U> =>
  value => {
    const decoded = decoder(value)
    if (!decoded.ok) return decoded
    return check(decoded.value) ? ok(decoded.value as U) : fail(expected, decoded.value)
  }

/** Turns a decoded value into another, which may itself be refused. */
export const transform =
  <T, U>(decoder: Decoder<T>, fn: (value: T) => Result<U, string>): Decoder<U> =>
  value => {
    const decoded = decoder(value)
    if (!decoded.ok) return decoded
    const transformed = fn(decoded.value)
    return transformed.ok ? transformed : fail(transformed.error, decoded.value)
  }

/** `$.a.b[0]`, the JSONPath-like spelling of an error's path. */
export const formatPath = (path: readonly (string | number)[]): string =>
  path.reduce<string>(
    (spelled, key) =>
      typeof key === 'number' ? `${spelled}[${key}]` : /^[A-Za-z_$][\w$]*$/.test(key) ? `${spelled}.${key}` : `${spelled}[${JSON.stringify(key)}]`,
    '$',
  )

export const describeDecodeError = (error: DecodeError): string =>
  `${formatPath(error.path)} must be ${error.expected} (got ${error.received})`
