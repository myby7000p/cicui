import { fetchBook, uploadBook } from '@/api/books'
import { conflictSkill, fetchSkillContent, generateSkill, regenerateSkill } from '@/api/skills'
import type { Api } from '@/api/types'
import type { IngestionStage } from '@/types'

/** §1.1: processing is asynchronous and the only signal is asking again, so this is a poll. */
const POLL_MS = 1500

/** How far each stage has taken the bar; the server gives no percentage. */
const STAGE_PROGRESS: Record<IngestionStage, number> = {
  queued: 10,
  extracting: 35,
  compiling: 55,
  generating: 75,
  attaching: 90,
  completed: 100
}

export function stageProgress(stage: IngestionStage): number {
  return STAGE_PROGRESS[stage]
}

/** The book stopped moving and said why. `reason` is the engine's own text, shown as is. */
export class BookFailedError extends Error {
  readonly bookId: string

  constructor(bookId: string, reason: string) {
    super(reason)
    this.bookId = bookId
  }
}

/** §5.1: the book already has an active skill, so the user picks 直接使用 or 重新生成. */
export class SkillExistsError extends Error {
  readonly skill: Api.SkillView

  constructor(skill: Api.SkillView) {
    super(skill.id)
    this.skill = skill
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** The book's status is the first three dots; the client's own requests are the last two. */
function stageOf(status: Api.BookStatus): IngestionStage {
  if (status === 'ready') return 'generating'
  if (status === 'failed') return 'compiling'
  return status
}

export type StageListener = (stage: IngestionStage) => void

/**
 * §3.3 → §3.2: hand the file over, then keep asking until the book settles on `ready` or `failed`.
 * There is no deadline on purpose — a slow engine is not a reason to tell the user it broke.
 */
export async function uploadAndProcess(
  input: { file: File; title?: string; author?: string },
  onStage: StageListener
): Promise<Api.BookCard> {
  onStage('queued')
  let book = await uploadBook(input)
  while (book.status !== 'ready' && book.status !== 'failed') {
    onStage(stageOf(book.status))
    await delay(POLL_MS)
    book = await fetchBook(book.id)
  }
  onStage(stageOf(book.status))
  if (book.status === 'failed') throw new BookFailedError(book.id, book.error ?? '')
  return book
}

/** §5.1, with the dedupe turned into a typed branch instead of an error the caller must sniff. */
export async function generateForBook(bookId: string, onStage: StageListener): Promise<Api.SkillView> {
  onStage('generating')
  try {
    return await generateSkill(bookId)
  } catch (cause) {
    const existing = conflictSkill(cause)
    if (existing) throw new SkillExistsError(existing)
    throw cause
  }
}

/** §5.2 → the fresh version, ready to be read back. */
export async function regenerateFor(skillId: string, onStage: StageListener): Promise<Api.SkillView> {
  onStage('generating')
  return regenerateSkill(skillId)
}

/** §5.5: the markdown body, which is what the local `skill.md` mirrors. */
export async function readSkillMarkdown(skill: Api.SkillView, onStage: StageListener): Promise<string> {
  onStage('attaching')
  const content = await fetchSkillContent(skill.id)
  return content.markdown
}
