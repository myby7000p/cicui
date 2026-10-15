import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/assets/main.css'
import '@/assets/ui.css'
import App from '@/App.vue'
import { i18n } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { router } from '@/router'
import { notify } from '@/composables/use-toast'
import { setSessionExpiredHandler, setTransportFailureHandler } from '@/utils/http'
import type { Http } from '@/utils/types'
import { useAccountStore } from '@/stores/account'
import { useChatStore } from '@/stores/chat'
import { useLanguageStore } from '@/stores/language'
import { useProjectStore } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)

// 100004 anywhere drops the session and opens the login dialog over the view underneath.
setSessionExpiredHandler(() => {
  useAccountStore().expireSession()
  useUiStore().openLogin()
})

// The transport layer owns no wording, so the three failure keys are rendered here.
const TRANSPORT_LABEL: Record<Http.Failure, MessageKey> = {
  network: 'http.error.network',
  timeout: 'http.error.timeout',
  status: 'http.error.status'
}
setTransportFailureHandler((failure, status) => {
  notify(i18n.global.t(TRANSPORT_LABEL[failure], status === undefined ? {} : { code: status }))
})

// The daily and per-mailbox counters were frontend bookkeeping and have been deleted; the keys they
// wrote stay on disk otherwise, and nothing reads them any more.
for (const key of Object.keys(window.localStorage)) {
  if (key.startsWith('lexforge:artifact-usage:') || key.startsWith('lexforge:library-usage:')) {
    window.localStorage.removeItem(key)
  }
}

// These stores keep their side effects in actions, so the app-wide wiring starts here: the theme is
// applied before the first frame, and the two persisted stores subscribe to their own state.
useUiStore().startThemeSync()
useProjectStore().startPersisting()
useChatStore().startPersisting()

const mount = (): void => {
  app.mount('#app')
}

// Resolve the locale, the stored session and the first route before the first frame: neither a wrong
// language nor a signed-out flash should greet the user on startup.
const account = useAccountStore()
account.restore()
Promise.all([useLanguageStore().initialize(), router.isReady()]).then(mount, mount)

// The token is checked after the window is up: a UUID-era or revoked token must not delay first paint,
// and the account's own language only applies once we know there is an account.
void account.verifySession().then(() => {
  useLanguageStore().adoptAccountLang(account.accountLang)
})
