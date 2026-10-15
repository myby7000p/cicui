/** One mailbox format for every field that asks for one: the register form and the library dialog. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Mirrors the server's `username` rule: 3-32 of `[a-zA-Z0-9_.-]`, and never an `@`. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/

export const USERNAME_MAX = 32
export const PASSWORD_MIN = 6
/** The backend takes up to 72, which is also where an over-long value stops being a password. */
export const PASSWORD_MAX = 72
export const EMAIL_MAX = 100

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function isUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim())
}

export function isPassword(value: string): boolean {
  return value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX
}
