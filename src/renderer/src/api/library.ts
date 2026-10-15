import type { ArtifactKind, ReadingEntry } from '@/types'

/** Thrown by the placeholder retrieval; the dialog then shows its "not wired" state. */
export class LibrarySearchNotConfiguredError extends Error {}

/**
 * US-060 / US-062 retrieval seam: books resolve through z-Library, papers through Google Scholar.
 * Swap the body for the real call and the dialog's loading / empty / failed states keep working.
 */
export async function searchEntries(query: string, kind: ArtifactKind): Promise<ReadingEntry[]> {
  throw new LibrarySearchNotConfiguredError(`library-search-not-configured:${kind}:${query}`)
}
