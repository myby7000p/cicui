/**
 * Bearer token storage, kept out of `http.ts`: the request layer reads it, `auth.ts` writes it,
 * nobody else touches it.
 */
const TOKEN_KEY = 'lexforge:token'

export function readToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function writeToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY)
}
