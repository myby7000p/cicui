/**
 * The wire contract every endpoint shares, in one namespace: `Http.Envelope<T>`, `Http.Failure`.
 * Types only — import with `import type { Http } from '@/utils/types'`.
 */
export namespace Http {
  /** Every response body: `{ code, message, data }`. */
  export interface Envelope<T> {
    code: number
    message: string
    data: T
  }

  /** What a failed response puts in `data` — error identity, not prose. */
  export interface ErrorPayload {
    error_code?: string
    message_key?: string
    params?: Record<string, unknown>
    field?: string
    trace_id?: string
    /** Some failures carry a resource with them, e.g. the skill behind a 300003 conflict. */
    [key: string]: unknown
  }

  /** How a request failed before any business answer existed. */
  export type Failure = 'network' | 'timeout' | 'status'
}
