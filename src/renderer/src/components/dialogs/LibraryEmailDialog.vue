<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '@/stores/account'
import { useChatStore } from '@/stores/chat'
import { isEmail } from '@/utils/validate'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppModal from '@/components/ui/AppModal.vue'

const { t } = useI18n()
const account = useAccountStore()
const chat = useChatStore()

const email = shallowRef('')
const agreed = shallowRef(false)
/** Opening this from Settings means swapping in a fresh mailbox, not a first registration. */
const currentMail = computed(() => account.libraryEmail)
const changing = computed(() => !!currentMail.value)
/** Message key rather than text, so switching language with the dialog open re-labels the error. */
const error = shallowRef('')

watch(
  () => chat.emailDialogOpen,
  (open) => {
    if (open) {
      agreed.value = false
      error.value = ''
    }
  }
)

function confirm(): void {
  const value = email.value.trim()
  if (!isEmail(value)) {
    error.value = 'dialog.email.invalid'
    return
  }
  if (!agreed.value) {
    error.value = 'dialog.email.legalRequired'
    return
  }
  chat.confirmLibraryEmail(value)
}
</script>

<template>
  <AppModal
    v-if="chat.emailDialogOpen"
    :title="t(changing ? 'dialog.email.changeTitle' : 'dialog.email.title')"
    :sub="t('dialog.email.sub')"
    @close="chat.abandonLibraryEmail()"
  >
    <p v-if="changing" class="current-mail">
      {{ t('dialog.email.current', { email: currentMail }) }}
    </p>

    <!-- N-16: the responsibility notice stays on this dialog. -->
    <div class="m-legal">
      <p class="legal-title">
        <AppIcon name="warning" :size="14" />
        {{ t('dialog.email.legal') }}
      </p>
    </div>

    <label class="check" for="agree">
      <input id="agree" v-model="agreed" type="checkbox" class="check__native" />
      <span class="check__box" :data-checked="agreed">
        <AppIcon v-if="agreed" name="check" :size="12" />
      </span>
      <span>{{ t('dialog.email.legalAgree') }}</span>
    </label>

    <div class="m-field">
      <label class="label" for="library-email">{{ t('dialog.email.label') }}</label>
      <input
        id="library-email"
        v-model="email"
        class="field"
        :class="{ 'field--invalid': error }"
        type="email"
        autocomplete="off"
        maxlength="80"
        :placeholder="t('dialog.email.placeholder')"
        @keydown.enter="confirm"
      />
      <p v-if="error" class="error">{{ t(error) }}</p>
    </div>

    <template #footer>
      <button type="button" class="btn" @click="chat.abandonLibraryEmail()">{{ t('common.cancel') }}</button>
      <button type="button" class="btn btn--primary" @click="confirm">{{ t('dialog.email.confirm') }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.current-mail {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: var(--lf-r-sm);
  background: var(--lf-surface-2);
  color: var(--lf-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.legal-title {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-weight: 600;
  color: var(--lf-warning);
}

.legal-title svg {
  flex: 0 0 auto;
  margin-top: 2px;
}

.check {
  position: relative;
}

.check__native {
  position: absolute;
  opacity: 0;
  width: 17px;
  height: 17px;
  margin: 0;
  cursor: pointer;
}

.check__native:focus-visible + .check__box {
  outline: 2px solid var(--lf-accent);
  outline-offset: 2px;
}
</style>
