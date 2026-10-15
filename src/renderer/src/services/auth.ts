import { fetchProfile, login, logout, register } from '@/api/auth'
import { apiLangFromLanguage, isUserPreferredLanguage, languageFromApiLang } from '@shared/language'
import { i18n } from '@/i18n'
import type { Api } from '@/api/types'
import { readJson, writeJson } from '@/utils/storage'
import type { Auth } from './types'
import { clearToken, readToken, writeToken } from './token'

const SESSION_KEY = 'lexforge:session'

function toAccount(profile: Api.ProfileData): Auth.Account {
  return {
    username: profile.username,
    email: profile.email ?? null,
    plan: profile.plan === 'paid' ? 'paid' : 'free',
    lang: languageFromApiLang(profile.lang)
  }
}

function persist(account: Auth.Account): Auth.Account {
  writeJson(SESSION_KEY, account)
  return account
}

/**
 * This file owns the session: who is signed in, what survives a restart, and the fact that neither
 * the password nor the token's contents ever reach storage as anything but the token itself.
 * The wire format is `Api.*`, the contract is `Auth.*` (services/types.ts), so a changed response
 * touches one file instead of this adapter.
 */
export const authAdapter: Auth.Adapter = {
  async signIn({ username, password }) {
    const result = await login({ username, password })
    writeToken(result.token)
    // The login answer only carries username / plan; the mailbox and the account language come from
    // the profile, and a token that cannot read its own profile is not a session worth keeping.
    try {
      return persist(toAccount(await fetchProfile()))
    } catch (cause) {
      clearToken()
      throw cause
    }
  },

  async signUp({ username, password, email }) {
    await register({
      username,
      password,
      email: email.trim() || undefined,
      // The language on screen is the account's language from the first message the server renders.
      lang: apiLangFromLanguage(i18n.global.locale.value)
    })
    return this.signIn({ username, password })
  },

  restore() {
    const stored = readJson(SESSION_KEY)
    // A UUID-era row has no `username`, so it is dropped and the user signs in again — which is what
    // the backend's token format change requires anyway.
    if (!stored || typeof stored !== 'object') return null
    const account = stored as Partial<Auth.Account>
    if (typeof account.username !== 'string') return null
    return {
      username: account.username,
      email: typeof account.email === 'string' ? account.email : null,
      plan: account.plan === 'paid' ? 'paid' : 'free',
      lang: isUserPreferredLanguage(account.lang) ? account.lang : null
    }
  },

  async verify() {
    if (!readToken()) return null
    try {
      return persist(toAccount(await fetchProfile()))
    } catch {
      // A dead token is cleared by the interceptor's session handler; anything else (no network)
      // leaves the stored profile alone so an offline start still shows who was here.
      return null
    }
  },

  forget() {
    clearToken()
    window.localStorage.removeItem(SESSION_KEY)
  },

  signOutRequest() {
    // Best effort: the local session is already gone, and a failure here must not undo that.
    void logout().catch(() => undefined)
  }
}
