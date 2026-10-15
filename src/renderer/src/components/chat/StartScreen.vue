<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import logoUrl from '@/assets/logo.svg'

const { t } = useI18n()
</script>

<template>
  <div class="empty-chat">
    <img class="ec-logo" :src="logoUrl" alt="LexForge" />
    <h2 class="ec-title">
      {{ t('app.name') }}
      <span>{{ t('app.brand') }}</span>
    </h2>
    <p class="ec-tagline">{{ t('tagline.empty') }}</p>
  </div>
</template>

<style scoped>
.empty-chat {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.ec-logo {
  width: 132px;
  height: auto;
  margin-bottom: 4px;
}

/* Same reason as the sidebar chip: the navy mark needs a light ground in dark mode. */
html.dark .ec-logo {
  padding: 16px 20px;
  border-radius: 22px;
  background: #eef0f8;
}

.ec-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.ec-title span {
  color: var(--lf-accent);
}

.ec-tagline {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
  color: var(--lf-faint);
}
</style>
