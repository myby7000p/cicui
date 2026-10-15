<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { THEME_MODES } from '@shared/ipc'
import { userPreferredLanguages } from '@shared/language'
import { THEME_LABEL } from '@/i18n/labels'
import { useAccountStore } from '@/stores/account'
import { useChatStore } from '@/stores/chat'
import { useLanguageStore } from '@/stores/language'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const account = useAccountStore()
const chat = useChatStore()
const language = useLanguageStore()
const ui = useUiStore()

const themes = THEME_MODES

function signOut(): void {
  account.signOut()
  ui.openLogin()
}
</script>

<template>
  <div class="settings">
    <div class="view-wrap view-wrap--narrow">
      <header class="view-head">
        <h2>{{ t('settings.title') }}</h2>
      </header>

      <div class="setting-row">
        <span class="k">{{ t('settings.account') }}</span>
        <span class="v">
          <b v-if="account.signedIn" class="mail">{{ account.username }}</b>
          <button v-else type="button" class="link link--solo" @click="ui.openLogin()">
            {{ t('account.signIn') }}
          </button>
        </span>
      </div>

      <div v-if="account.signedIn" class="setting-row">
        <span class="k">{{ t('settings.email') }}</span>
        <span class="v">
          <b v-if="account.email" class="mail">{{ account.email }}</b>
          <span v-else>{{ t('settings.emailNone') }}</span>
        </span>
      </div>

      <div v-if="account.libraryEmail" class="setting-row">
        <span class="k">{{ t('settings.libraryMailbox') }}</span>
        <span class="v">
          <b class="mail">{{ account.libraryEmail }}</b>
          <button type="button" class="link" @click="chat.openLibraryEmailDialog()">
            {{ t('settings.changeMailbox') }}
          </button>
          <button type="button" class="link" @click="account.forgetLibrary()">{{ t('settings.unbindMailbox') }}</button>
        </span>
      </div>

      <div class="setting-row">
        <span class="k">{{ t('settings.language') }}</span>
        <div class="seg" role="group" :aria-label="t('language.label')">
          <button
            v-for="option in userPreferredLanguages"
            :key="option"
            type="button"
            :aria-pressed="language.current === option"
            @click="language.select(option)"
          >
            {{ option === 'en-us' ? 'English' : '简体中文' }}
          </button>
        </div>
      </div>

      <div class="setting-row">
        <span class="k">{{ t('settings.theme') }}</span>
        <div class="seg" role="group" :aria-label="t('theme.label')">
          <button
            v-for="mode in themes"
            :key="mode"
            type="button"
            :aria-pressed="ui.themeMode === mode"
            @click="ui.setTheme(mode)"
          >
            {{ t(THEME_LABEL[mode]) }}
          </button>
        </div>
      </div>

      <div v-if="account.signedIn" class="setting-row">
        <span class="k">{{ t('settings.plan') }}</span>
        <span class="v">
          {{ account.plan === 'paid' ? t('account.paidWithRag') : t('account.freeNoRag') }}
        </span>
      </div>

      <div class="setting-row">
        <span class="k">{{ t('settings.model') }}</span>
        <span class="v">{{ t('settings.autoBest') }}</span>
      </div>

      <!-- One full-width button instead of a right-aligned link: the last thing in the list reads as an action. -->
      <button v-if="account.signedIn" type="button" class="btn btn--block signout" @click="signOut">
        {{ t('account.signOut') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.setting-row .k {
  flex: 0 0 auto;
}

.link {
  margin-left: 6px;
  border: 0;
  background: transparent;
  color: var(--lf-accent);
  font: inherit;
  cursor: pointer;
  padding: 0;
}

.link--solo {
  margin-left: 0;
}

.mail {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 220px;
  vertical-align: bottom;
}

/* Taller than a row control and separated from the list, so it reads as its own action. */
.signout {
  min-height: 42px;
  margin-top: 18px;
  color: var(--lf-fg);
}
</style>
