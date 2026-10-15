/**
 * localStorage is an external boundary: a row can be truncated, hand-edited, or written by an
 * older build, and the origin's quota can run out. Reads therefore repair, writes therefore report.
 */

export function isPresent<T>(value: T | null): value is T {
  return value !== null
}

/** Null covers both "nothing stored" and "not parseable"; the caller decides the fallback. */
export function readJson(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? '') as unknown
  } catch {
    return null
  }
}

/** False means the value did not fit: the caller decides what to drop before retrying. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
