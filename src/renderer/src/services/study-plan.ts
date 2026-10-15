import type { StudyPlan, StudyPlanAssumptions, StudyPlanDay } from '@/types'

const MINUTES_PER_PAGE = { 'zh-cn': 3, 'en-us': 5 } as const

const WEEKDAYS_PER_WEEK = 5
const WEEKEND_DAYS_PER_WEEK = 2

/** N-12: weekday 1 h/day, weekend 2 h/day, EN 5 min/page, ZH 3 min/page. */
export function buildStudyPlan(assumptions: StudyPlanAssumptions): StudyPlan {
  const minutesPerPage = MINUTES_PER_PAGE[assumptions.readingLanguage]
  const totalMinutes = Math.max(1, Math.round(assumptions.pages * minutesPerPage))
  const minutesPerWeek =
    assumptions.weekdayHours * 60 * WEEKDAYS_PER_WEEK + assumptions.weekendHours * 60 * WEEKEND_DAYS_PER_WEEK

  const days: StudyPlanDay[] = []
  let remaining = totalMinutes
  let minutesSpent = 0
  let day = 1

  while (remaining > 0) {
    // The plan starts on a Monday so the weekday / weekend split is predictable.
    const isWeekend = day % 7 === 6 || day % 7 === 0
    // At least a minute per day: a zero-hour budget must still consume the loop, otherwise
    // `remaining` never drops and the renderer hangs filling `days`.
    const budget = Math.max(1, Math.round((isWeekend ? assumptions.weekendHours : assumptions.weekdayHours) * 60))
    const minutes = Math.min(budget, remaining)
    const before = minutesSpent
    minutesSpent += minutes
    remaining -= minutes

    const startPage = Math.floor(before / minutesPerPage) + 1
    const endPage = Math.max(startPage, Math.floor(minutesSpent / minutesPerPage))
    days.push({ day, isWeekend, minutes, startPage, endPage })
    day += 1
  }

  return {
    minutesPerPage,
    totalMinutes,
    minutesPerWeek,
    days,
    calendarDays: days.length
  }
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}
