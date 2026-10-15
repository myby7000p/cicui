import type { PlanTier } from '@/types'

/**
 * Request and response shapes of the backend, in one namespace so a call site reads
 * `Api.LoginParams` instead of importing four names from wherever they happened to live.
 *
 * Types only: always `import type { Api } from '@/api/types'`, because the namespace emits no
 * runtime value and a plain import would leave the bundler looking for an export that is not there.
 */
export namespace Api {
  /** Response keys are snake_case, exactly as Jackson writes them (see the handoff doc). */
  export interface LoginData {
    token: string
    username: string
    plan: PlanTier
  }

  export interface ProfileData {
    /** `sys_user.id`: a Long rendered as a string, no longer a 36-character UUID. */
    id: string
    username: string
    email: string | null
    plan: PlanTier
    /** Header form: `zh-CN` / `en-US`. */
    lang: string
    created_at: string
  }

  export interface LoginParams {
    username: string
    password: string
  }

  export interface RegisterParams extends LoginParams {
    /** Optional upstream, and an empty string is read as null. */
    email?: string
    /** Sent with the form so a freshly created account already carries the language on screen. */
    lang: string
  }

  /** §1.1: the book pipeline is asynchronous, so the client polls until `ready` or `failed`. */
  export type BookStatus = 'queued' | 'extracting' | 'compiling' | 'ready' | 'failed'

  export interface BookCard {
    /** 12-character short id, or `primer` for the built-in sample book. */
    id: string
    title: string
    author: string
    /** `upload` for user files, `catalog` for the built-in sample. */
    source: string
    status: BookStatus
    /** Progress prose while processing (Chinese, from the engine); null once ready. */
    detail: string | null
    error: string | null
    chapter_count: number
    engine: string | null
    created_at: string
    updated_at: string
  }

  /** §5: one skill version of a book. `superseded` rows stay readable for the version lineage. */
  export interface SkillView {
    id: string
    /** Canonical name, e.g. `Deep-Learning-skill`. */
    name: string
    book_id: string
    status: 'active' | 'superseded'
    skill_kind: 'book' | 'merged' | 'custom'
    model_name: string
    model_version: string | null
    summary: string | null
    /** Backend working directory — unreachable from the client, so never render or open it. */
    content_path: string | null
    created_at: string
  }

  /** The only non-`{detail}` failure shape: `POST /api/skills/generate` on an already-covered book. */
  export interface GenerateConflict {
    status: 'conflict'
    skill: SkillView
  }

  export interface SkillContent {
    skill_id: string
    name: string
    status: 'active' | 'superseded'
    format: 'markdown'
    markdown: string
  }

  /** §3.6 / §3.7: the active skill's stored markdown, addressed by book. */
  export interface SkillFile {
    book_id: string
    markdown: string
  }

  export interface ChapterHead {
    id: string
    title: string
    /** Currently always null until the real engine lands, so every call site needs a fallback. */
    one_line: string | null
  }

  export interface ChapterBody {
    id: string
    title: string
    one_line: string | null
    body: string
  }

  export interface ChapterList {
    skill_id: string
    chapters: ChapterHead[]
  }

  export interface BookOutline {
    book_id: string
    chapters: { id: string; title: string }[]
  }

  /** §4: what the book can be asked to produce. */
  export type StudyAction = 'distill' | 'summary' | 'close_read' | 'notes' | 'slides'

  export interface StudyParams {
    book_id: string
    action: StudyAction
    /**
     * §4 documents `focus` and `instruction`, but measured against the live backend any non-empty
     * value comes back `500001 请求参数不对` (empty strings and `ui_lang` are fine), so neither is
     * sent until the server actually takes them.
     */
    ui_lang?: 'zh' | 'en'
  }

  export interface StudyResult {
    title: string
    kind: StudyAction
    markdown: string
    chapter_refs: string[]
    /** Only for `action: 'slides'`, and only when the generator was allowed to run. */
    pptx_base64: string | null
  }

  /** §2.7 of the handoff doc. Measured keys are snake_case, not the `fileName` the doc shows. */
  export interface ExportedFile {
    file_name: string
    content_type: string
    base64: string
  }

  /** §2: readiness probe — `llm: false` means study answers come back as chapter skeletons. */
  export interface Health {
    ok: boolean
    version: string
    book_to_skill: boolean
    llm: boolean
    model: string | null
  }

  export interface Ok {
    ok: boolean
  }
}
