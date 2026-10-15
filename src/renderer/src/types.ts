import type { UserPreferredLanguage } from '@shared/language'
import type { NativeThemeMode } from '@shared/ipc'

export type LocalizedText = Record<UserPreferredLanguage, string>

export type ArtifactKind = 'book' | 'paper'

export type EntrySource = 'z-library' | 'google-scholar'

export interface SourceFile {
  name: string
  extension: string
  sizeMb: number
  pages: number
}

export interface ReadingEntry {
  id: string
  title: LocalizedText
  author: string
  summary: LocalizedText
  source: EntrySource
  format: string
  year: number
  pages: number
}

export interface OutlineSection {
  heading: LocalizedText
  points: LocalizedText[]
}

export interface Outline {
  title: LocalizedText
  sections: OutlineSection[]
}

export interface StudyPlanAssumptions {
  readingLanguage: UserPreferredLanguage
  pages: number
  weekdayHours: number
  weekendHours: number
}

export interface StudyPlanDay {
  day: number
  isWeekend: boolean
  minutes: number
  startPage: number
  endPage: number
}

export interface StudyPlan {
  minutesPerPage: number
  totalMinutes: number
  minutesPerWeek: number
  days: StudyPlanDay[]
  calendarDays: number
}

/**
 * §1.1's book pipeline plus the two client-side steps the progress modal shows afterwards.
 * `failed` is not a stage: a failure lands as a notice card carrying the engine's own `error`.
 */
export type IngestionStage =
  | 'queued'
  | 'extracting'
  | 'compiling'
  | 'generating'
  | 'attaching'
  | 'completed'

export interface IngestionRun {
  id: string
  fileName: string
  artifactKind: ArtifactKind
  skillName: string
  stage: IngestionStage
  progress: number
}

export interface SkillFile {
  path: string
  content: string
}

export interface Skill {
  id: string
  name: string
  /** Server-side skill id (UUID) when this skill came from `POST /api/skills/generate`. */
  skillId: string | null
  /** The book the skill belongs to; content, chapters and feedback are addressed through it. */
  bookId: string | null
  artifactKind: ArtifactKind
  title: LocalizedText
  pages: number
  updatedAt: number
  file: SkillFile
}

export interface Project {
  id: string
  name: string
  /** Set when the project was created from an uploaded book, so a delete can reach the backend. */
  bookId: string | null
  skillIds: string[]
  createdAt: number
  updatedAt: number
}

export interface ChatConversation {
  id: string
  title: LocalizedText
  messages: ChatMessage[]
  /** Every skill the thread was routed to, in the order they were mentioned. */
  skillMention: string[]
}

export type ChatBlock =
  | { kind: 'text'; text: LocalizedText }
  | { kind: 'markdown'; text: LocalizedText }
  | { kind: 'outline'; outline: Outline; sourceTitle: LocalizedText; subtitle: LocalizedText }
  | { kind: 'study-plan'; assumptions: StudyPlanAssumptions }
  | { kind: 'entry-list'; artifactKind: ArtifactKind; entries: ReadingEntry[] }
  | { kind: 'notice'; tone: 'info' | 'warning'; title: LocalizedText; detail: LocalizedText }

/** One entry of a row's overflow menu; `danger` renders it as the destructive choice. */
export interface MenuItem {
  key: string
  label: string
  danger?: boolean
}

/** The tabs a result card can show; a tab only exists once its block is in the message. */
export type ResultTab = 'overview' | 'plan' | 'similar'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  createdAt: number
  blocks: ChatBlock[]
}

/** Same three values main and the preload bridge speak, so no translation table is needed. */
export type ThemeMode = NativeThemeMode

export type PlanTier = 'free' | 'paid'
