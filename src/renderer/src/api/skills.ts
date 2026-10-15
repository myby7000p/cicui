import { CODE } from './codes'
import { ApiError, http } from '@/utils/http'
import type { Api } from './types'

/** §5.1 — silent: the conflict is a normal branch with its own dialog, not a failure to announce. */
export function generateSkill(bookId: string): Promise<Api.SkillView> {
  return http.post<Api.SkillView, Api.SkillView>('/api/skills/generate', { book_id: bookId }, { silent: true })
}

/**
 * §5.1's dedupe branch. Measured against the live backend: `300003` carries the existing skill
 * directly in `data`, so the dialog needs no follow-up lookup.
 */
export function conflictSkill(cause: unknown): Api.SkillView | null {
  if (!(cause instanceof ApiError) || cause.code !== CODE.SKILL_CONFLICT) return null
  const payload = cause.payload as unknown as Partial<Api.SkillView> | null
  return payload && typeof payload.id === 'string' && typeof payload.book_id === 'string'
    ? (payload as Api.SkillView)
    : null
}

/** §5.2 — a new version; the previous one becomes `superseded` and a `thumb_down` is written for it. */
export function regenerateSkill(skillId: string): Promise<Api.SkillView> {
  return http.post<Api.SkillView, Api.SkillView>(`/api/skills/${skillId}/regenerate`)
}

/** §5.3 — one rating per user per skill, later submissions overwrite the earlier one. */
export function sendFeedback(skillId: string, rating: 'thumb_up' | 'thumb_down'): Promise<Api.Ok> {
  return http.post<Api.Ok, Api.Ok>(`/api/skills/${skillId}/feedback`, { rating }, { silent: true })
}

/** §5.4 */
export function fetchSkill(skillId: string): Promise<Api.SkillView> {
  return http.get<Api.SkillView, Api.SkillView>(`/api/skills/${skillId}`)
}

/** §5.4b — active plus superseded, which is what the version lineage reads from. */
export function fetchSkillsOfBook(bookId: string): Promise<Api.SkillView[]> {
  return http.get<Api.SkillView[], Api.SkillView[]>('/api/skills', { params: { book_id: bookId } })
}

/** §5.5 — the only way to read a body; `content_path` on the view points at the server's disk. */
export function fetchSkillContent(skillId: string): Promise<Api.SkillContent> {
  return http.get<Api.SkillContent, Api.SkillContent>(`/api/skills/${skillId}/content`)
}

/** §5.6 — heads only, so a long book does not pull every chapter body to draw a tree. */
export function fetchChapters(skillId: string): Promise<Api.ChapterList> {
  return http.get<Api.ChapterList, Api.ChapterList>(`/api/skills/${skillId}/chapters`)
}

/** §5.7 — `chapterId` looks like `ch01` and is matched case-insensitively upstream. */
export function fetchChapter(skillId: string, chapterId: string): Promise<Api.ChapterBody> {
  return http.get<Api.ChapterBody, Api.ChapterBody>(`/api/skills/${skillId}/chapters/${chapterId}`)
}

/**
 * Handoff §2.7: the file comes back inside the envelope as base64, so the client assembles the
 * download itself. Rendering takes a while, hence its own longer timeout.
 */
export function exportSkill(skillId: string, format: 'pdf' | 'docx'): Promise<Api.ExportedFile> {
  return http.get<Api.ExportedFile, Api.ExportedFile>(`/api/skills/${skillId}/export`, {
    params: { format },
    timeout: 120 * 1000
  })
}
