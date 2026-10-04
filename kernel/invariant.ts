// Invariants: assumptions the code relies on that only a defect can break.
//
// An expected failure (bad input, a missing file, a refused call) is a value
// on Result's error track. A broken invariant is a bug: it throws at once,
// where the bug is, instead of carrying corrupt state further. A check is one
// comparison and a branch; the message is built only when it fails.
//
// Canonical copy: kernel/invariant.ts; every mod mirrors it at hooks/kernel/invariant.ts.

export class InvariantError extends Error {
  override readonly name = 'InvariantError'
}

export function invariant(condition: unknown, message: string | (() => string)): asserts condition {
  if (!condition) throw new InvariantError(typeof message === 'function' ? message() : message)
}

/** For the arm of an exhaustive switch the type system proves unreachable. */
export const unreachable = (value: never): never => {
  throw new InvariantError(`unreachable: ${JSON.stringify(value)}`)
}
