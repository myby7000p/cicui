import { http } from '@/utils/http'
import type { Api } from './types'

/** §3.3: what the upload endpoint accepts, and its size ceiling. */
export const BOOK_EXTENSIONS = [
  '.pdf',
  '.epub',
  '.docx',
  '.txt',
  '.md',
  '.markdown',
  '.html',
  '.htm',
  '.rtf',
  '.rst',
  '.adoc'
] as const
export const BOOK_MAX_BYTES = 80 * 1024 * 1024

/** §3.1 */
export function fetchBooks(): Promise<Api.BookCard[]> {
  return http.get<Api.BookCard[], Api.BookCard[]>('/api/books')
}

/** §3.2 — the polling target while a book works through `queued → extracting → compiling → ready`. */
export function fetchBook(bookId: string): Promise<Api.BookCard> {
  return http.get<Api.BookCard, Api.BookCard>(`/api/books/${bookId}`)
}

/**
 * §3.3 — multipart, not JSON. Re-uploading identical content returns the existing book card rather
 * than a copy, which is expected behaviour the caller must not treat as an error.
 */
export function uploadBook(input: { file: File; title?: string; author?: string }): Promise<Api.BookCard> {
  const form = new FormData()
  form.append('file', input.file)
  if (input.title) form.append('title', input.title)
  if (input.author) form.append('author', input.author)
  return http.post<Api.BookCard, Api.BookCard>('/api/books', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/** §3.4 — a hard delete that cascades the book's skills, chapters and feedback. */
export function deleteBook(bookId: string): Promise<Api.Ok> {
  return http.delete<Api.Ok, Api.Ok>(`/api/books/${bookId}`)
}

/** §3.5 */
export function fetchOutline(bookId: string): Promise<Api.BookOutline> {
  return http.get<Api.BookOutline, Api.BookOutline>(`/api/books/${bookId}/outline`)
}

/** §3.6 — the book's current active skill text. 404 also means "not generated yet". */
export function fetchBookSkill(bookId: string): Promise<Api.SkillFile> {
  return http.get<Api.SkillFile, Api.SkillFile>(`/api/books/${bookId}/skill`, { silent: true })
}

/**
 * §3.7 — overwrites the whole document. Known behaviour, not a bug to work around: chapters are not
 * re-split, so study and `/chapters` keep reading the previous division until a regeneration.
 */
export function saveBookSkill(bookId: string, markdown: string): Promise<Api.SkillFile> {
  return http.put<Api.SkillFile, Api.SkillFile>(`/api/books/${bookId}/skill`, { markdown })
}
