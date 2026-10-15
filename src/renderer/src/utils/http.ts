import axios, { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { apiLangFromLanguage } from '@shared/language'
import { i18n } from '@/i18n'
import { notify } from '@/composables/use-toast'
import { CODE } from '@/api/codes'
import { readToken } from '@/services/token'
import type { Http } from './types'

/* Same skeleton as edataops-web-v3 `utils/request.ts`: one axios instance, a request interceptor
 * (token / language / GET params / repeat-submit guard) and a response interceptor that owns the
 * envelope. The backend contract this now matches: HTTP status is always 200, business success is
 * `code === 0`, every key is snake_case, and `message` is already rendered in the `Lang` we send —
 * so this layer forwards the text instead of mapping codes to hardcoded copy. */

declare module 'axios' {
  interface AxiosRequestConfig {
    /** The caller renders the failure itself (a form field), so the interceptor stays quiet. */
    silent?: boolean
  }
}

/** A rejected business result: `{ code !== 0 }` inside the envelope. `message` is server-written. */
export class ApiError extends Error {
  readonly code: number
  readonly errorCode: string | null
  readonly messageKey: string | null
  readonly params: Record<string, unknown>
  /** The field Bean Validation blamed, when the failure is about one input. */
  readonly field: string | null
  readonly traceId: string | null
  /**
   * The failure's raw `data`. Most callers never need it; the skill conflict does — the server puts
   * the existing skill in there, so the dialog does not have to look it up with a second request.
   */
  readonly payload: Http.ErrorPayload | null

  constructor(envelope: Http.Envelope<Http.ErrorPayload | null>) {
    super(envelope.message)
    this.code = envelope.code
    this.payload = envelope.data
    this.errorCode = envelope.data?.error_code ?? null
    this.messageKey = envelope.data?.message_key ?? null
    this.params = envelope.data?.params ?? {}
    this.field = envelope.data?.field ?? null
    this.traceId = envelope.data?.trace_id ?? null
  }
}

export class HttpError extends Error {
  readonly failure: Http.Failure
  readonly status?: number

  constructor(failure: Http.Failure, status?: number) {
    // Copy lives in the catalog, not here: this is transport, not a business answer.
    super(failure)
    this.failure = failure
    this.status = status
  }
}

/** Set at bootstrap so the interceptor can drop the session without importing the stores. */
let sessionExpiredHandler: (() => void) | null = null
export function setSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler
}

/**
 * Transport failures have no backend sentence to show, and this layer owns no copy, so the wording
 * is decided at bootstrap: the handler receives the failure key and renders it through i18n.
 */
let transportFailureHandler: ((failure: Http.Failure, status?: number) => void) | null = null
export function setTransportFailureHandler(handler: (failure: Http.Failure, status?: number) => void): void {
  transportFailureHandler = handler
}

/** Guards against two re-login passes while the first one is still landing. */
export const isRelogin = { show: false }

// The one axios instance every endpoint module shares.
export const http = axios.create({
  // Set in the root .env; a new host must also join the CSP connect-src in index.html.
  baseURL: import.meta.env.VITE_API_BASE as string | undefined,
  // Long on purpose: ingestion and retrieval calls are server-side work, not clicks.
  timeout: 60 * 1000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
})

// Attach the bearer token, except on the requests marked anonymous.
const setTokenIfNeeded = (config: InternalAxiosRequestConfig): void => {
  const headers = AxiosHeaders.from(config.headers)
  // `isToken: false` marks the anonymous calls (login itself); the marker must not reach the wire.
  const isToken = headers.get('isToken') === false
  headers.delete('isToken')
  const token = readToken()
  if (token && !isToken) headers.set('Authorization', `Bearer ${token}`)
  config.headers = headers
}

// The backend renders `message` by this header, so every request carries the language on screen.
const setLangHeader = (config: InternalAxiosRequestConfig): void => {
  const headers = AxiosHeaders.from(config.headers)
  headers.set('Lang', apiLangFromLanguage(i18n.global.locale.value))
  config.headers = headers
}

// Fold GET params into the query string instead of letting axios serialize them.
const handleGetRequestParams = (config: InternalAxiosRequestConfig): void => {
  if (config.method === 'get' && config.params && Object.keys(config.params).length > 0) {
    let url = config.url + '?' + tansParams(config.params)
    url = url.slice(0, -1)
    config.params = {}
    config.url = url
  }
}

const REPEAT_SUBMIT_KEY = 'lexforge:last-mutation'

/** The key is shared with anything else on this origin, so a foreign value must not throw here. */
function parseLastRequest(raw: string): { url: string; data: string; time: number } | null {
  try {
    return JSON.parse(raw) as { url: string; data: string; time: number }
  } catch {
    return null
  }
}

// Warn about a mutation that repeats within the window; the request still goes through.
const preventRepeatSubmit = (config: InternalAxiosRequestConfig): void => {
  if (config.method !== 'post' && config.method !== 'put') return
  const requestObj = {
    url: config.url,
    data: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
    time: Date.now(),
  }
  const sessionObj = window.sessionStorage.getItem(REPEAT_SUBMIT_KEY)
  const interval = 1000 // Anything under this gap (ms) counts as the same submit.
  if (sessionObj) {
    const previous = parseLastRequest(sessionObj)
    if (
      previous &&
      previous.data === requestObj.data &&
      requestObj.time - previous.time < interval &&
      previous.url === requestObj.url
    ) {
      window.console.warn(`[${previous.url}]: repeat submit blocked for 1s`)
      return
    }
  }
  window.sessionStorage.setItem(REPEAT_SUBMIT_KEY, JSON.stringify(requestObj))
}

/** `tansParams` equivalent: nested objects and arrays become `a[b]=1` / `a[]=1` query pairs. */
function tansParams(params: Record<string, unknown>): string {
  let result = ''
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'object' && value !== null) {
      for (const [subKey, subValue] of Object.entries(value)) {
        const part = subValue === '' || subValue === null ? '' : `${encodeURIComponent(key)}[${subKey}]=`
        if (part) result += `${part}${encodeURIComponent(String(subValue))}&`
      }
    } else {
      const part = value === '' || value === null ? '' : `${encodeURIComponent(key)}=`
      if (part) result += `${part}${encodeURIComponent(String(value))}&`
    }
  }
  return result
}

// Request interceptor: token, language, GET params, repeat-submit guard.
http.interceptors.request.use(
  (config) => {
    setTokenIfNeeded(config)
    setLangHeader(config)
    handleGetRequestParams(config)
    preventRepeatSubmit(config)
    return config
  },
  (error) => Promise.reject(error)
)

/** One re-login pass at a time: signing in is not enforced, so this only opens the dialog. */
function dropSession(message: string, silent: boolean): void {
  if (isRelogin.show) return
  isRelogin.show = true
  if (!silent && message) notify(message)
  sessionExpiredHandler?.()
  isRelogin.show = false
}

// Response interceptor: the envelope decides, and callers only ever see `data`.
http.interceptors.response.use(
  // Axios types the fulfilled handler as returning a response, but this contract resolves to the
  // payload: every endpoint module is typed against it, e.g. `http.post<BookCard, BookCard>`.
  (res: AxiosResponse<Http.Envelope<Http.ErrorPayload | null>>) => {
    const envelope = res.data
    const silent = res.config.silent === true
    if (envelope.code === CODE.OK) return envelope.data as unknown as AxiosResponse
    if (envelope.code === CODE.UNAUTHORIZED) dropSession(envelope.message, silent)
    else {
      // A 500-class answer carries a trace id the user can quote to support; keep it in the console.
      if (envelope.data?.trace_id) window.console.error(`[api ${envelope.code}] trace=${envelope.data.trace_id}`)
      if (!silent) notify(envelope.message)
    }
    return Promise.reject(new ApiError(envelope))
  },
  (error: AxiosError) => {
    // Business failures never reach here: the contract answers 200 for everything, so a rejection is
    // a transport event — no connection, a timeout, or a gateway in front of the service.
    const failure: Http.Failure =
      error.code === 'ECONNABORTED' ? 'timeout' : error.response ? 'status' : 'network'
    const status = error.response?.status
    if (error.config?.silent !== true) transportFailureHandler?.(failure, status)
    return Promise.reject(new HttpError(failure, status))
  }
)
