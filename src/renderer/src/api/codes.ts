/**
 * Six-digit business codes from the backend: module (100 AUTH / 200 BOOK / 300 SKILL / 400 STUDY /
 * 500 SYSTEM) times 1000 plus the error type. Only the ones the client branches on are named here —
 * every other failure is shown as the backend's own `message`, which already arrived in our `Lang`.
 */
export const CODE = {
  /** No envelope code means success. */
  OK: 0,
  /** Missing / expired token: the session is over, the answer is a new login. */
  UNAUTHORIZED: 100004,
  /** Five straight failures for this account + IP pair: locked for 15 minutes. */
  ATTEMPT_LOCKED: 100007,
  /** The book already has an active skill, so the user picks 直接使用 / 重新生成. */
  SKILL_CONFLICT: 300003,
  /** Skill missing, or its body has not been generated yet. */
  SKILL_NOT_READY: 300002
} as const
