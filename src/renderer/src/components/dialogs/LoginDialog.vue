<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import logoUrl from '@/assets/logo.svg'
import { useEscapeKey } from '@/composables/use-escape-key'
import AppIcon from '@/components/ui/AppIcon.vue'
import { CODE } from '@/api/codes'
import { authAdapter } from '@/services/auth'
import { ApiError, HttpError } from '@/utils/http'
import { EMAIL_MAX, PASSWORD_MAX, USERNAME_MAX, isEmail, isPassword, isUsername } from '@/utils/validate'
import { useAccountStore } from '@/stores/account'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const account = useAccountStore()
const ui = useUiStore()

type FieldKey = 'username' | 'password' | 'confirm' | 'email'

const mode = shallowRef<'signIn' | 'signUp'>('signIn')
const username = shallowRef('')
const password = shallowRef('')
const confirm = shallowRef('')
const email = shallowRef('')
const shown = ref({ password: false, confirm: false })
/**
 * A complaint of our own keeps a message key, so it follows a language switch while it is on screen.
 * A complaint from the server keeps its rendered `text`: the backend already wrote it in the language
 * of the `Lang` header we sent, and re-translating it would mean copying their key table.
 */
const error = shallowRef<{ key?: string; text?: string; field: FieldKey } | null>(null)
const busy = shallowRef(false)
/** 100007: the button waits out the lock the server reported, ticking down locally. */
const lockSeconds = shallowRef(0)
let lockTicker: number | undefined

const signedUp = computed(() => mode.value === 'signUp')
const locked = computed(() => lockSeconds.value > 0)

function invalid(field: FieldKey): boolean {
  return error.value?.field === field
}

function switchMode(next: 'signIn' | 'signUp'): void {
  mode.value = next
  error.value = null
  confirm.value = ''
}

function closeLogin(): void {
  ui.closeLogin()
}

/* Same dismissal contract as `AppModal`: Escape or a click on the mask closes the card, because
 * signing in is not enforced and the view underneath is always reachable. */
useEscapeKey(closeLogin)

function startLock(seconds: number): void {
  lockSeconds.value = Math.max(1, Math.round(seconds))
  window.clearInterval(lockTicker)
  lockTicker = window.setInterval(() => {
    lockSeconds.value -= 1
    if (lockSeconds.value <= 0) window.clearInterval(lockTicker)
  }, 1000)
}

onBeforeUnmount(() => window.clearInterval(lockTicker))

/** The server names the field it rejected; anything else lands on the credential pair. */
function fieldOf(name: string | null, fallback: FieldKey): FieldKey {
  return name === 'username' || name === 'password' || name === 'email' ? name : fallback
}

async function submit(): Promise<void> {
  if (busy.value || locked.value) return
  const name = username.value.trim()
  if (!isUsername(name)) {
    error.value = { key: 'login.error.username', field: 'username' }
    return
  }
  if (!isPassword(password.value)) {
    error.value = { key: 'login.error.password', field: 'password' }
    return
  }
  if (signedUp.value && password.value !== confirm.value) {
    error.value = { key: 'login.error.mismatch', field: 'confirm' }
    return
  }
  const mail = email.value.trim()
  if (signedUp.value && mail && !isEmail(mail)) {
    error.value = { key: 'login.error.email', field: 'email' }
    return
  }
  error.value = null
  busy.value = true
  try {
    const payload = { username: name, password: password.value }
    const next = signedUp.value
      ? await authAdapter.signUp({ ...payload, email: mail })
      : await authAdapter.signIn(payload)
    account.applySession(next)
    closeLogin()
  } catch (cause) {
    if (cause instanceof ApiError) {
      // Five straight failures lock the pair for a quarter of an hour; only the countdown is ours.
      if (cause.code === CODE.ATTEMPT_LOCKED) startLock(Number(cause.params.seconds) || 15 * 60)
      error.value = { text: cause.message, field: fieldOf(cause.field, 'password') }
    } else {
      // An unreachable backend is not a wrong password: the two get different copy.
      const offline = cause instanceof HttpError && (cause.failure === 'network' || cause.failure === 'timeout')
      error.value = {
        key: offline ? 'login.error.network' : signedUp.value ? 'login.error.signUp' : 'login.error.signIn',
        field: 'password'
      }
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="modal-mask login-mask" @mousedown.self="closeLogin()">
    <div class="login__card" role="dialog" aria-modal="true" :aria-label="t('app.displayName')">
      <button type="button" class="login__close" :aria-label="t('login.close')" :title="t('login.close')" @click="closeLogin()">
        <AppIcon name="close" :size="16" />
      </button>

      <header class="login__head">
        <img class="login__logo" :src="logoUrl" alt="LexForge" />
        <h1>{{ t('app.displayName') }}</h1>
        <p>{{ t('tagline.topbar') }}</p>
      </header>

      <div class="login__tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="!signedUp" @click="switchMode('signIn')">{{ t('login.title') }}</button>
        <button type="button" role="tab" :aria-selected="signedUp" @click="switchMode('signUp')">{{ t('login.register') }}</button>
      </div>

      <form class="login__form" novalidate @submit.prevent="submit">
        <!-- The account name is a username here, not a mailbox: the register contract rejects `@`. -->
        <div class="login__field" :class="{ 'login__field--invalid': invalid('username') }">
          <div class="login__box">
            <AppIcon class="login__icon" name="user" :size="18" />
            <label class="login__label" for="login-username">{{ t('login.username') }}</label>
            <input
              id="login-username"
              v-model="username"
              class="login__input"
              type="text"
              autocomplete="username"
              spellcheck="false"
              :maxlength="USERNAME_MAX"
              :placeholder="t('login.usernamePh')"
              @input="error = null"
            />
          </div>
        </div>

        <div class="login__field" :class="{ 'login__field--invalid': invalid('password') }">
          <div class="login__box">
            <AppIcon class="login__icon" name="lock" :size="18" />
            <label class="login__label" for="login-password">{{ t('login.password') }}</label>
            <input
              id="login-password"
              v-model="password"
              class="login__input"
              :type="shown.password ? 'text' : 'password'"
              :autocomplete="signedUp ? 'new-password' : 'current-password'"
              :maxlength="PASSWORD_MAX"
              :placeholder="t('login.passwordPh')"
              @input="error = null"
            />
            <button
              type="button"
              class="login__reveal"
              :aria-label="shown.password ? t('login.hidePassword') : t('login.showPassword')"
              :aria-pressed="shown.password"
              :title="shown.password ? t('login.hidePassword') : t('login.showPassword')"
              @click="shown.password = !shown.password"
            >
              <AppIcon :name="shown.password ? 'eyeOff' : 'eye'" :size="17" />
            </button>
          </div>
        </div>

        <div v-if="signedUp" class="login__field" :class="{ 'login__field--invalid': invalid('confirm') }">
          <div class="login__box">
            <AppIcon class="login__icon" name="lock" :size="18" />
            <label class="login__label" for="login-confirm">{{ t('login.confirmPassword') }}</label>
            <input
              id="login-confirm"
              v-model="confirm"
              class="login__input"
              :type="shown.confirm ? 'text' : 'password'"
              autocomplete="new-password"
              :maxlength="PASSWORD_MAX"
              :placeholder="t('login.passwordPh')"
              @input="error = null"
            />
            <button
              type="button"
              class="login__reveal"
              :aria-label="shown.confirm ? t('login.hidePassword') : t('login.showPassword')"
              :aria-pressed="shown.confirm"
              :title="shown.confirm ? t('login.hidePassword') : t('login.showPassword')"
              @click="shown.confirm = !shown.confirm"
            >
              <AppIcon :name="shown.confirm ? 'eyeOff' : 'eye'" :size="17" />
            </button>
          </div>
        </div>

        <!-- Register keeps the mailbox optional; the account is reached by username either way. -->
        <div v-if="signedUp" class="login__field" :class="{ 'login__field--invalid': invalid('email') }">
          <div class="login__box">
            <AppIcon class="login__icon" name="mail" :size="18" />
            <label class="login__label" for="login-email">{{ t('login.emailOptional') }}</label>
            <input
              id="login-email"
              v-model="email"
              class="login__input"
              type="email"
              autocomplete="email"
              :maxlength="EMAIL_MAX"
              :placeholder="t('login.emailPh')"
              @input="error = null"
            />
          </div>
        </div>

        <p v-if="error" class="error">{{ error.key ? t(error.key) : error.text }}</p>

        <button type="submit" class="btn btn--primary login__submit" :disabled="busy || locked">
          {{
            locked
              ? t('login.lockedRetry', { seconds: lockSeconds })
              : busy
                ? t('login.busy')
                : t(signedUp ? 'login.createAccount' : 'login.title')
          }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* `.modal-mask` already paints the translucent backdrop and centers the card; this only adds
   scrolling so the form stays reachable on a short window. */
.login-mask {
  overflow-y: auto;
}

.login__card {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 26px 26px 22px;
  border: 1px solid var(--lf-border);
  border-radius: var(--lf-r-lg);
  background: var(--lf-surface);
  box-shadow: var(--lf-shadow);
}

.login__close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--lf-muted);
  cursor: pointer;
}

.login__close:hover {
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
}

.login__head {
  text-align: center;
  margin-bottom: 18px;
}

.login__logo {
  width: 96px;
  height: auto;
}

html.dark .login__logo {
  padding: 10px 14px;
  border-radius: 18px;
  background: #eef0f8;
}

.login__head h1 {
  margin: 8px 0 2px;
  font-size: 20px;
  font-weight: 700;
}

.login__head p {
  margin: 0;
  font-size: 12.5px;
  color: var(--lf-faint);
}

/* Folder tabs, taken from bwgzt/uweb/front-v3 `src/views/login.vue` `.tab-list`: the selected tab
 * takes the panel colour and the grey band curves into it. Divergences, each marked below: colours
 * are LexForge tokens instead of the reference's #fff / #eee / #0170FE so dark mode works, the
 * state hook is `aria-selected` instead of `.tab-selected` / `.not-selected`, the sizes are scaled
 * to this 380px card, and the joint is a radial-gradient concave fillet — the reference's joint is
 * a full-height skewX slab that only reads as a curve because the FOUR neighbouring tabs paint
 * their own grey slabs over it (z-index: 1); with two tabs the same slab renders as a bare
 * diagonal, so the fillet below does that job self-contained. */
.login__tabs {
  --tab-h: 40px;
  --tab-curve: var(--lf-r-md);
  --tab-active: var(--lf-surface);
  --tab-band: var(--lf-sunk);
  display: flex;
  position: relative;
  z-index: 2;
  margin-bottom: 16px;
  border-radius: var(--lf-r-sm) var(--lf-r-sm) 0 0;
  background-color: var(--tab-band);
  overflow: hidden;
}

.login__tabs button {
  flex: 1;
  height: var(--tab-h);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--lf-muted);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  cursor: pointer;
  user-select: none;
}

.login__tabs button[aria-selected='true'] {
  background: var(--tab-active);
  border-radius: var(--tab-curve) var(--tab-curve) 0 0;
  color: var(--lf-accent);
}

/* 12×12 concave fillets at the base of the selected tab: the gradient keeps the band colour inside
 * a quarter circle anchored at the outer top corner and lets the panel colour flare into the
 * bottom, so the tab base widens into the band the way the reference's joint reads. */
.login__tabs button[aria-selected='true']::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--tab-curve));
  bottom: 0;
  width: var(--tab-curve);
  height: var(--tab-curve);
  background: radial-gradient(
    circle var(--tab-curve) at 0 0,
    var(--tab-band) calc(var(--tab-curve) - 0.5px),
    var(--tab-active) var(--tab-curve)
  );
}

.login__tabs button[aria-selected='true']::after {
  content: '';
  position: absolute;
  right: calc(-1 * var(--tab-curve));
  bottom: 0;
  width: var(--tab-curve);
  height: var(--tab-curve);
  background: radial-gradient(
    circle var(--tab-curve) at 100% 0,
    var(--tab-band) calc(var(--tab-curve) - 0.5px),
    var(--tab-active) var(--tab-curve)
  );
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Google-style outlined text field, taken from ai-agent/demo `src/views/login/LoginPage.vue`
 * `.field-box` / `.field-label` / `.field-input`: a leading icon, a borderless input, and the label
 * absolutely positioned inside the box so it floats up onto the border and cuts a notch in it
 * (`background: var(--lf-surface)` = the card colour) once the field is focused or holds text. The
 * placeholder stays transparent until focus, because the resting label already sits in its place.
 * Divergences, each marked below: plain CSS instead of SCSS nesting (this project has no preprocessor)
 * with LexForge tokens instead of the demo's `--okNN` oklch set, `html.dark` instead of
 * `[data-theme="dark"]`, and the floated label takes the accent colour only while focused, which is
 * what Google does and the demo flattens to one colour. */
.login__box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid var(--lf-border-strong);
  border-radius: var(--lf-r-md);
  /* Transparent fill: the floated label must paint in the card colour to break the border. */
  background: transparent;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.login__box:hover {
  border-color: var(--lf-muted);
}

.login__box:focus-within {
  border-color: var(--lf-accent);
  box-shadow: 0 0 0 4px var(--lf-accent-soft);
}

.login__label {
  position: absolute;
  /* 12px box padding + 18px icon + 8px gap, minus the label's own 4px padding, so the text lines up
     with where the input's text starts. */
  left: 34px;
  top: 50%;
  padding: 0 4px;
  transform: translateY(-50%) scale(1);
  transform-origin: left center;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--lf-muted);
  background: transparent;
  pointer-events: none;
  transition: transform 0.16s ease, top 0.16s ease, color 0.16s ease, background-color 0.16s ease;
}

.login__box:has(.login__input:not(:placeholder-shown)) .login__label {
  top: 0;
  transform: translateY(-50%) scale(0.8);
  color: var(--lf-muted);
  background: var(--lf-surface);
}

.login__box:focus-within .login__label {
  top: 0;
  transform: translateY(-50%) scale(0.8);
  color: var(--lf-accent);
  background: var(--lf-surface);
}

.login__icon {
  flex-shrink: 0;
  color: var(--lf-faint);
  transition: color 0.16s ease;
}

.login__box:focus-within .login__icon {
  color: var(--lf-accent);
}

.login__input {
  flex: 1;
  /* Without this the input is a flex item with min-width:auto and long values push the box open. */
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--lf-fg);
  font: inherit;
  font-size: 13.5px;
}

.login__input:focus {
  outline: none;
}

.login__input::placeholder {
  color: transparent;
  transition: color 0.16s ease;
}

.login__box:focus-within .login__input::placeholder {
  color: var(--lf-faint);
}

.login__reveal {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 2px;
  border: 0;
  background: none;
  color: var(--lf-faint);
  cursor: pointer;
  transition: color 0.16s ease;
}

.login__reveal:hover,
.login__reveal[aria-pressed='true'] {
  color: var(--lf-accent);
}

.login__field--invalid .login__box {
  border-color: var(--lf-danger);
}

.login__field--invalid .login__box:focus-within {
  box-shadow: 0 0 0 4px rgba(229, 72, 77, 0.18);
}

html.dark .login__field--invalid .login__box:focus-within {
  box-shadow: 0 0 0 4px rgba(255, 99, 105, 0.22);
}

.login__field--invalid .login__label {
  color: var(--lf-danger);
}

.login__submit {
  width: 100%;
  min-height: 40px;
  margin-top: 2px;
}
</style>
