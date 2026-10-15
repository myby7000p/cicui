import type { PlanTier } from '@/types'
import type { UserPreferredLanguage } from '@shared/language'

/**
 * Contracts of the local service layer, grouped by concern instead of sitting one file each:
 * `Auth.Account`, `Asr.Session`, `Time.Relative`.
 * Types only — import with `import type { Auth, Asr, Time } from '@/services/types'`.
 */
export namespace Auth {
  export interface Account {
    /** The login name, not the mailbox: `sys_user.username` forbids `@`. */
    username: string
    email: string | null
    /** Whatever `login` / `me` says; the client never changes it on its own. */
    plan: PlanTier
    /** The language stored on the account, used only while the user has not picked one locally. */
    lang: UserPreferredLanguage | null
  }

  /** What the form supplies; the account service decides the rest. */
  export interface SignInPayload {
    username: string
    password: string
  }

  export interface SignUpPayload extends SignInPayload {
    email: string
  }

  export interface Adapter {
    signIn(payload: SignInPayload): Promise<Account>
    signUp(payload: SignUpPayload): Promise<Account>
    /** Cold start, offline-safe: the stored profile decides who is signed in. */
    restore(): Account | null
    /** Cold start, online half: proves the token still means something and refreshes plan / lang. */
    verify(): Promise<Account | null>
    /** Drops the local session; the server is told separately and never blocks it. */
    forget(): void
    signOutRequest(): void
  }
}

/** Speech-to-text seam: the adapter is the only piece that knows how to reach a recogniser. */
export namespace Asr {
  export interface Segment {
    text: string
    /** A final segment is settled text; a partial one gets replaced by the next update. */
    final: boolean
  }

  export interface Session {
    onText(listener: (segment: Segment) => void): void
    stop(): void
  }

  export interface Adapter {
    start(stream: MediaStream): Promise<Session>
  }
}

/** Coarse "how long ago" buckets, kept as a message key so the UI can re-translate on language switch. */
export namespace Time {
  export interface Relative {
    key: string
    params: Record<string, number>
  }
}
