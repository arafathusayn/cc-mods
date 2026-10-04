// Railway-oriented results: the shared kernel of this repository.
//
// A fallible step returns `Result<T, E>` instead of throwing, so every failure
// is a typed value on the error track and a pipeline reads top to bottom.
// Exceptions are reserved for defects; `attempt` and `attemptAsync` are the
// one place a thrown error from the outside world is turned into a value.
//
// Canonical copy: kernel/result.ts at the repository root. Every mod carries a
// byte-identical copy at hooks/kernel/result.ts (a hooks module may import
// only from its own folder); `bun run check` fails on drift.
//
// Plain frozen-shape objects, no classes: cheap to create, structurally typed,
// and safe to cross the hooks runtime's boundary.

export type Ok<T> = { readonly ok: true; readonly value: T }
export type Err<E> = { readonly ok: false; readonly error: E }
export type Result<T, E> = Ok<T> | Err<E>
export type AsyncResult<T, E> = Promise<Result<T, E>>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E>(error: E): Err<E> => ({ ok: false, error })

/** The `ok` value of a void step. */
export const unit: Ok<undefined> = ok(undefined)

export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result

export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.ok ? result : err(fn(result.error))

/** Continues on the success track with a step that may itself fail. */
export const andThen = <T, U, E, F>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> => (result.ok ? fn(result.value) : result)

/** `andThen` for asynchronous steps. */
export const andThenAsync = async <T, U, E, F>(
  result: Result<T, E> | AsyncResult<T, E>,
  fn: (value: T) => Result<U, F> | AsyncResult<U, F>,
): AsyncResult<U, E | F> => {
  const settled = await result
  return settled.ok ? fn(settled.value) : settled
}

export const match = <T, E, R>(
  result: Result<T, E>,
  arms: { readonly ok: (value: T) => R; readonly err: (error: E) => R },
): R => (result.ok ? arms.ok(result.value) : arms.err(result.error))

/** The value, or `fallback` on the error track. */
export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.ok ? result.value : fallback

/** All values in order, or the first error. */
export const all = <T, E>(results: readonly Result<T, E>[]): Result<T[], E> => {
  const values: T[] = []
  for (const result of results) {
    if (!result.ok) return result
    values.push(result.value)
  }
  return ok(values)
}

/** Splits results into their values and every error, keeping order. */
export const partition = <T, E>(
  results: readonly Result<T, E>[],
): { readonly values: T[]; readonly errors: E[] } => {
  const values: T[] = []
  const errors: E[] = []
  for (const result of results) {
    if (result.ok) values.push(result.value)
    else errors.push(result.error)
  }
  return { values, errors }
}

/** Runs code that may throw, putting a thrown value on the error track. */
export const attempt = <T, E>(fn: () => T, onThrow: (cause: unknown) => E): Result<T, E> => {
  try {
    return ok(fn())
  } catch (cause) {
    return err(onThrow(cause))
  }
}

/** Awaits work that may reject, putting the rejection on the error track. */
export const attemptAsync = async <T, E>(
  fn: () => Promise<T>,
  onThrow: (cause: unknown) => E,
): AsyncResult<T, E> => {
  try {
    return ok(await fn())
  } catch (cause) {
    return err(onThrow(cause))
  }
}

/** A human-readable message for an unknown thrown value. */
export const describeCause = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause)
