<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StudyPlanAssumptions } from '@/types'
import { buildStudyPlan, formatMinutes } from '@/services/study-plan'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ assumptions: StudyPlanAssumptions }>()
const emit = defineEmits<{ update: [assumptions: StudyPlanAssumptions] }>()

const { t } = useI18n()
const expanded = shallowRef(false)

const plan = computed(() => buildStudyPlan(props.assumptions))
const hiddenDays = computed(() => Math.max(0, plan.value.days.length - 5))
const dailyPages = computed(() => {
  const first = plan.value.days[0]
  return first ? first.endPage - first.startPage + 1 : 0
})

const LIMITS = {
  pages: { min: 10, max: 2000 },
  weekdayHours: { min: 0.5, max: 8 },
  weekendHours: { min: 0.5, max: 8 }
} as const

type AssumptionField = keyof typeof LIMITS

function clamp(field: AssumptionField, value: number): number {
  const { min, max } = LIMITS[field]
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}

/** The card never writes the message block itself: edits go up and the store decides where they land. */
function patch(field: AssumptionField, value: number): void {
  emit('update', { ...props.assumptions, [field]: clamp(field, value) })
}

function step(field: AssumptionField, delta: number): void {
  patch(field, Number((props.assumptions[field] + delta).toFixed(2)))
}

/** `min`/`max` on the input only guard the spinner arrows, so a typed value is clamped here. */
function onInput(field: AssumptionField, event: Event): void {
  patch(field, Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="study-plan">
    <p class="sp-title">{{ t('card.planTitle') }}</p>

    <div class="sp-row">
      <span class="k">{{ t('card.planRows.pages') }}</span>
      <span class="stepper">
        <button type="button" :aria-label="t('card.planRows.pages')" @click="step('pages', -10)">
          <AppIcon name="minus" :size="13" />
        </button>
        <input :value="props.assumptions.pages" type="number" min="10" max="2000" step="10" @change="onInput('pages', $event)" />
        <button type="button" :aria-label="t('card.planRows.pages')" @click="step('pages', 10)">
          <AppIcon name="plus" :size="13" />
        </button>
      </span>
    </div>
    <div class="sp-row">
      <span class="k">{{ t('card.planRows.weekday') }}</span>
      <span class="stepper">
        <button type="button" :aria-label="t('card.planRows.weekday')" @click="step('weekdayHours', -0.5)">
          <AppIcon name="minus" :size="13" />
        </button>
        <input
          :value="props.assumptions.weekdayHours"
          type="number"
          min="0.5"
          max="8"
          step="0.5"
          @change="onInput('weekdayHours', $event)"
        />
        <button type="button" :aria-label="t('card.planRows.weekday')" @click="step('weekdayHours', 0.5)">
          <AppIcon name="plus" :size="13" />
        </button>
      </span>
    </div>
    <div class="sp-row">
      <span class="k">{{ t('card.planRows.weekend') }}</span>
      <span class="stepper">
        <button type="button" :aria-label="t('card.planRows.weekend')" @click="step('weekendHours', -0.5)">
          <AppIcon name="minus" :size="13" />
        </button>
        <input
          :value="props.assumptions.weekendHours"
          type="number"
          min="0.5"
          max="8"
          step="0.5"
          @change="onInput('weekendHours', $event)"
        />
        <button type="button" :aria-label="t('card.planRows.weekend')" @click="step('weekendHours', 0.5)">
          <AppIcon name="plus" :size="13" />
        </button>
      </span>
    </div>
    <div class="sp-row">
      <span class="k">{{ t('card.planRows.dailyPages') }}</span>
      <span class="v">{{ t('card.pagesPerDay', { pages: dailyPages }) }}</span>
    </div>
    <div class="sp-row">
      <span class="k">{{ t('card.planRows.speed') }}</span>
      <span class="v">{{ t('card.planRows.speedValue', { minutes: plan.minutesPerPage }) }}</span>
    </div>
    <div class="sp-row">
      <span class="k">{{ t('card.planRows.duration') }}</span>
      <span class="v">
        {{ t('card.planRows.durationValue', { days: plan.calendarDays, value: formatMinutes(plan.totalMinutes) }) }}
      </span>
    </div>

    <ul v-if="expanded" class="sp-days">
      <li v-for="day in plan.days" :key="day.day">
        <b>{{ t('card.dayLabel', { day: day.day }) }}</b>
        <span>{{ t('card.minutes', { minutes: day.minutes }) }}</span>
        <span class="muted">{{ t('card.pagesRange', { start: day.startPage, end: day.endPage }) }}</span>
        <span v-if="day.isWeekend" class="tag tag--warning">{{ t('card.weekendTag') }}</span>
      </li>
    </ul>

    <button v-if="hiddenDays > 0 || expanded" type="button" class="sp-more" @click="expanded = !expanded">
      {{ expanded ? t('card.showLess') : t('card.showMore', { count: hiddenDays }) }}
    </button>

    <p class="sp-note">{{ t('card.freeLimit') }}</p>
  </div>
</template>

<style scoped>
.sp-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 700;
}

.sp-row .v {
  font-weight: 600;
  text-align: right;
}

.sp-days {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
}

.sp-days li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-top: 1px dashed var(--lf-border);
  font-size: 12.5px;
  flex-wrap: wrap;
}

.sp-days b {
  min-width: 58px;
}

.sp-more {
  margin-top: 10px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--lf-accent);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
</style>
