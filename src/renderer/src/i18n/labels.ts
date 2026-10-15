import type { MessageKey } from '@/i18n'
import type { ArtifactKind, EntrySource, IngestionStage, ResultTab, ThemeMode } from '@/types'

/**
 * Enum-to-label tables. The values are checked against the message catalog, so renaming a key or
 * dropping an enum member fails the build instead of printing `undefined` at runtime — which is what
 * `t(\`theme.${mode}\`)` used to trade away for brevity.
 */
export const THEME_LABEL: Record<ThemeMode, MessageKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark'
}

export const ARTIFACT_KIND_LABEL: Record<ArtifactKind, MessageKey> = {
  book: 'library.kind.book',
  paper: 'library.kind.paper'
}

export const RESULT_TAB_LABEL: Record<ResultTab, MessageKey> = {
  overview: 'card.tabs.overview',
  plan: 'card.tabs.plan',
  similar: 'card.tabs.similar'
}

export const ENTRY_SOURCE_LABEL: Record<EntrySource, MessageKey> = {
  'z-library': 'card.source.z-library',
  'google-scholar': 'card.source.google-scholar'
}

export const INGESTION_STAGE_LABEL: Record<IngestionStage, MessageKey> = {
  queued: 'progress.stage.queued',
  extracting: 'progress.stage.extracting',
  compiling: 'progress.stage.compiling',
  generating: 'progress.stage.generating',
  attaching: 'progress.stage.attaching',
  completed: 'progress.stage.completed'
}
