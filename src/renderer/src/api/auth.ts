import { http } from '@/utils/http'
import type { Api } from './types'

/**
 * `POST /api/auth/login` — the account name is a username, never an email: the register contract
 * rejects `@` in `username`. Anonymous by definition, and `silent` because the form renders the
 * answer inline (wrong credential, locked, …) instead of letting a toast say it twice.
 */
export function login(params: Api.LoginParams): Promise<Api.LoginData> {
  return http.post<Api.LoginData, Api.LoginData>('/api/auth/login', params, {
    headers: { isToken: false },
    silent: true
  })
}

/** `POST /api/auth/register` — success says nothing useful, so the caller logs in right after. */
export function register(params: Api.RegisterParams): Promise<null> {
  return http.post<null, null>('/api/auth/register', params, {
    headers: { isToken: false },
    silent: true
  })
}

/** `GET /api/auth/me` — silent: a dead token on cold start must not raise a toast. */
export function fetchProfile(): Promise<Api.ProfileData> {
  return http.get<Api.ProfileData, Api.ProfileData>('/api/auth/me', { silent: true })
}

/**
 * `POST /api/auth/logout` — the server only drops its own session record. Silent: whoever is
 * signing out has already lost the account locally, and a toast would only confuse that.
 */
export function logout(): Promise<null> {
  return http.post<null, null>('/api/auth/logout', undefined, { silent: true })
}
