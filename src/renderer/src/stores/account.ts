import { defineStore } from 'pinia'
import type { UserPreferredLanguage } from '@shared/language'
import type { PlanTier } from '@/types'
import { authAdapter } from '@/services/auth'
import type { Auth } from '@/services/types'

/** The mailbox is the z-Library account, so it outlives a restart. */
const LIBRARY_EMAIL_KEY = 'lexforge:library-email'

export const useAccountStore = defineStore('account', {
  state: () => ({
    /** The login name; `null` while nobody is signed in. */
    username: null as string | null,
    /** Optional on the account, so it can be null even when signed in. */
    email: null as string | null,
    /** `me.lang`, kept only to seed the UI language when the user has not picked one. */
    accountLang: null as UserPreferredLanguage | null,
    /** Straight from `login` / `me` — the client never invents or flips this locally. */
    plan: 'free' as PlanTier,
    libraryEmail: window.localStorage.getItem(LIBRARY_EMAIL_KEY)
  }),

  getters: {
    signedIn: (state): boolean => !!state.username
  },

  actions: {
    /** The auth service answers who is signed in; the form and the cold start both hand it over here. */
    applySession(next: Auth.Account): void {
      this.username = next.username
      this.email = next.email
      this.accountLang = next.lang
      this.plan = next.plan
    },

    clearSession(): void {
      this.username = null
      this.email = null
      this.accountLang = null
      this.plan = 'free'
    },

    registerLibrary(email: string): void {
      this.libraryEmail = email
      window.localStorage.setItem(LIBRARY_EMAIL_KEY, email)
    },

    forgetLibrary(): void {
      this.libraryEmail = null
      window.localStorage.removeItem(LIBRARY_EMAIL_KEY)
    },

    /** Signing out on purpose: the server is told too, so its session record goes with it. */
    signOut(): void {
      authAdapter.signOutRequest()
      authAdapter.forget()
      this.clearSession()
    },

    /**
     * The server said the token is worthless (100004). Nothing to announce: the library mailbox is a
     * z-Library address, not our session, so it stays.
     */
    expireSession(): void {
      authAdapter.forget()
      this.clearSession()
    },

    /** Cold start, first half: whoever was here before, without waiting on the network. */
    restore(): void {
      const next = authAdapter.restore()
      if (next) this.applySession(next)
    },

    /**
     * Cold start, second half: prove the stored token still resolves. The interceptor already drops
     * the session on 100004, so this only has to adopt whatever the account says now.
     */
    async verifySession(): Promise<void> {
      const next = await authAdapter.verify()
      if (next) this.applySession(next)
    }
  }
})
