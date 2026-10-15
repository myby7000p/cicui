/**
 * Short mark for the 54×74 cover block. A full title does not fit there: Chinese takes its first
 * two characters, a short Latin title collapses to word initials ("Retrieval-Augmented
 * Generation" → RAG) and a longer one to its first word ("Attention Is All You Need" → Attention).
 */
export function coverMark(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return 'Lex'
  if (/[\u3400-\u9fff]/.test(trimmed[0])) return trimmed.slice(0, 2)

  const parts = trimmed.split(/[\s\-–—_·.,&|/()]+/).filter(Boolean)
  if (parts.length <= 3) return parts.map((word) => word[0].toUpperCase()).join('')
  return parts[0].slice(0, 10)
}
