// Conventional Commits 1.0.0, as this repository applies it:
//   <type>(<scope>)!: <subject>
//
//   <body>
//
//   <footer>
// The scope is optional and kebab-case; for a change to one mod it is the
// mod's name.
import { err, ok, type Result } from '../../kernel/result'

export const COMMIT_TYPES = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'test',
  'build',
  'ci',
  'chore',
  'style',
  'revert',
] as const

export type CommitType = (typeof COMMIT_TYPES)[number]

export type CommitHeader = {
  readonly type: CommitType
  readonly scope: string | undefined
  readonly isBreaking: boolean
  readonly subject: string
}

export type CommitMessageError = { readonly kind: 'commit/invalid'; readonly reason: string }

export const MAX_HEADER_LENGTH = 72

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^()]*)\))?(?<breaking>!)?: (?<subject>.+)$/
const SCOPE = /^[a-z0-9]+(?:[-/.][a-z0-9]+)*$/
const TYPES: ReadonlySet<string> = new Set(COMMIT_TYPES)
// Messages git writes itself, and autosquash markers a rebase folds away.
const GENERATED = /^(?:Merge |Revert "|fixup! |squash! |amend! )/

const invalid = (reason: string): CommitMessageError => ({ kind: 'commit/invalid', reason })

/** The message as git keeps it: comment lines and the scissors tail removed, outer blank lines trimmed. */
export const cleanMessage = (raw: string): string => {
  const scissors = raw.indexOf('# ------------------------ >8 ------------------------')
  const kept = scissors === -1 ? raw : raw.slice(0, scissors)
  return kept
    .split('\n')
    .filter(line => !line.startsWith('#'))
    .join('\n')
    .trim()
}

/** The header of a conventional message, or why the message is not one. Git's own messages pass as undefined. */
export const parseCommitMessage = (raw: string): Result<CommitHeader | undefined, CommitMessageError> => {
  const message = cleanMessage(raw)
  if (message.length === 0) return err(invalid('the message is empty'))

  const [header = '', separator, ...rest] = message.split('\n')
  if (GENERATED.test(header)) return ok(undefined)

  if (header.length > MAX_HEADER_LENGTH) {
    return err(invalid(`the header is ${header.length} characters; keep it to ${MAX_HEADER_LENGTH}`))
  }
  if (separator !== undefined && separator.trim() !== '') {
    return err(invalid('leave one blank line between the header and the body'))
  }
  if (rest.length > 0 && rest.every(line => line.trim() === '')) {
    return err(invalid('the body is blank'))
  }

  const match = HEADER.exec(header)
  if (match?.groups === undefined) {
    return err(invalid('the header must read "<type>(<scope>): <subject>", the scope optional'))
  }
  const { type = '', scope, breaking, subject = '' } = match.groups

  if (!TYPES.has(type)) return err(invalid(`"${type}" is not a type; use one of ${COMMIT_TYPES.join(', ')}`))
  if (scope !== undefined && !SCOPE.test(scope)) {
    return err(invalid(`the scope "${scope}" must be kebab-case, such as a mod's name`))
  }
  if (subject !== subject.trim()) return err(invalid('the subject has stray whitespace'))
  if (/^[A-Z][a-z]/.test(subject)) return err(invalid('start the subject in lower case'))
  if (subject.endsWith('.')) return err(invalid('end the subject without a period'))

  return ok({ type: type as CommitType, scope, isBreaking: breaking === '!', subject })
}

export const describeCommitMessageError = (error: CommitMessageError): string =>
  `not a conventional commit: ${error.reason}`
