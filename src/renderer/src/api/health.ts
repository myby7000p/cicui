import { http } from '@/utils/http'
import type { Api } from './types'

/**
 * §2 — silent: an offline backend at startup is normal (the app is usable without it) and must not
 * raise a toast. `llm: false` is worth a notice though: study answers then come back as chapter
 * skeletons rather than real prose.
 */
export function fetchHealth(): Promise<Api.Health> {
  return http.get<Api.Health, Api.Health>('/api/health', { silent: true, timeout: 5000 })
}
