import { http } from '@/utils/http'
import type { Api } from './types'

/**
 * §4 — asking a book to produce something. The book has to be `ready`; a 400 covers "unknown action",
 * "not on the shelf", "still processing" and "empty skill index", so the caller shows `detail` as is.
 *
 * Output language is decided upstream in this order: an explicit instruction in `instruction`
 * ("请输出英文"), then the language of the question, then `ui_lang`. The book's own language does
 * not matter, which is why the composer needs no special syntax for it.
 */
export function runStudy(params: Api.StudyParams): Promise<Api.StudyResult> {
  // Long on purpose even against the instance default: an LLM pass is not a click.
  return http.post<Api.StudyResult, Api.StudyResult>('/api/study', params, { timeout: 120 * 1000 })
}
