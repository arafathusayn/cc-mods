// JSON documents as the repository stores them: parsed and decoded once, at
// the boundary, into domain types; written back in one canonical form.
import { describeDecodeError, type DecodeError, type Decoder } from '../../kernel/decode'
import { attempt, err, ok, type Result } from '../../kernel/result'

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject
export type JsonObject = { readonly [key: string]: JsonValue }

export type DocumentError =
  | { readonly kind: 'document/syntax'; readonly source: string; readonly message: string }
  | { readonly kind: 'document/shape'; readonly source: string; readonly cause: DecodeError }

export const readDocument = <T>(text: string, source: string, decoder: Decoder<T>): Result<T, DocumentError> => {
  const parsed = attempt(
    (): unknown => JSON.parse(text),
    (cause): DocumentError => ({
      kind: 'document/syntax',
      source,
      message: cause instanceof Error ? cause.message : String(cause),
    }),
  )
  if (!parsed.ok) return parsed
  const decoded = decoder(parsed.value)
  return decoded.ok ? ok(decoded.value) : err({ kind: 'document/shape', source, cause: decoded.error })
}

/** Two-space JSON with a trailing newline, the repository's on-disk form. */
export const encodeDocument = (value: JsonValue): string => `${JSON.stringify(value, null, 2)}\n`

export const describeDocumentError = (error: DocumentError): string =>
  error.kind === 'document/syntax'
    ? `${error.source}: invalid JSON (${error.message})`
    : `${error.source}: ${describeDecodeError(error.cause)}`
