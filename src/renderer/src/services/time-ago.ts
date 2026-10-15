import type { Time } from './types'

/** Coarse buckets only — the projects and library rows just need "刚刚 / 2 小时前 / 3 天前". */
export function timeAgo(at: number, now: number = Date.now()): Time.Relative {
  const minutes = Math.floor((now - at) / 60000)
  if (minutes < 1) return { key: 'projects.justNow', params: {} }
  if (minutes < 60) return { key: 'projects.minutesAgo', params: { count: minutes } }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { key: 'projects.hoursAgo', params: { count: hours } }
  return { key: 'projects.daysAgo', params: { count: Math.floor(hours / 24) } }
}
