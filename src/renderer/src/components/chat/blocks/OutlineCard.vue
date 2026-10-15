<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Outline } from '@/types'
import { useLocalized } from '@/composables/use-localized'

const props = defineProps<{ outline: Outline }>()

const { t } = useI18n()
const pick = useLocalized()
</script>

<template>
  <div>
    <h3 class="block-title">{{ t('card.outlineTitle') }}</h3>
    <!-- Outline sections and points carry no id and arrive once with the message, so the
         position is the stable key; ids belong to the outline service that has to supply them. -->
    <ol class="outline-list">
      <li v-for="(section, index) in props.outline.sections" :key="index">
        <p class="oh">{{ pick(section.heading) }}</p>
        <ul class="op">
          <li v-for="(point, pointIndex) in section.points" :key="pointIndex" class="muted">{{ pick(point) }}</li>
        </ul>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.block-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
}

.outline-list li {
  margin: 7px 0;
}

.oh {
  margin: 0;
  font-weight: 600;
}

.op {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.7;
}
</style>
