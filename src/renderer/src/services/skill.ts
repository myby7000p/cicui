import type { UserPreferredLanguage } from '@shared/language'
import type { ArtifactKind, LocalizedText, Outline, Skill, StudyPlanAssumptions } from '@/types'

/**
 * US-013: a skill folder is named after the work and `@name` has to stay typeable, so the slug
 * keeps unicode letters — an ASCII-only filter turns 「邻书」 into an empty string and a timestamp.
 * The cap differs by use: a project name only has to read, a skill name also gets typed.
 */
export function slugify(value: string, maxLength = 40): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

function uniqueName(base: string, taken: string[], fallback: string): string {
  const root = base || fallback
  let candidate = root
  let index = 2
  while (taken.includes(candidate)) {
    candidate = `${root}-${index}`
    index += 1
  }
  return candidate
}

function fromTitle(title: LocalizedText): string {
  return slugify(title['en-us']) || slugify(title['zh-cn'])
}

/** project-name-skill stands in here: a real release derives the project name from the entry
 *  fields, so this slug is the seam to replace. */
export function proposeProjectName(title: LocalizedText, taken: string[]): string {
  return uniqueName(fromTitle(title), taken, `project-${Date.now().toString(36)}`)
}

export function proposeSkillName(title: LocalizedText, taken: string[]): string {
  return uniqueName(fromTitle(title), taken, `skill-${Date.now().toString(36)}`)
}

/** A file's name without its extension: the extension is not part of a slug or a display title. */
export function fileBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

/** N-21: a skill is a named folder holding one `skill.md`. */
export function skillFileName(): string {
  return 'skill.md'
}

export function skillMarkdown(input: {
  skillName: string
  sourceName: string
  artifactKind: ArtifactKind
  title: LocalizedText
  /** Present only once the outline service returns sections. */
  outline?: Outline
  plan: StudyPlanAssumptions
  minutesPerPage: number
  language: UserPreferredLanguage
}): string {
  const zh = input.language === 'zh-cn'
  const label = {
    usage: zh ? '使用方式' : 'How to use',
    usageBody: zh
      ? `在对话中输入 @${input.skillName} 提问，回答只依据本${input.artifactKind === 'book' ? '书' : '文'}${input.outline ? '与下方大纲' : ''}。`
      : `Ask with @${input.skillName} in the chat box; answers follow this source${input.outline ? ' and the outline below' : ''}.`,
    outline: zh ? '学习大纲' : 'Learning outline',
    pace: zh ? '阅读节奏' : 'Reading pace',
    pages: zh ? `共 ${input.plan.pages} 页，每页约 ${input.minutesPerPage} 分钟` : `${input.plan.pages} pages at about ${input.minutesPerPage} minutes per page`,
    budget: zh
      ? `工作日 ${input.plan.weekdayHours} 小时/天，周末 ${input.plan.weekendHours} 小时/天`
      : `${input.plan.weekdayHours} h per weekday, ${input.plan.weekendHours} h per weekend day`,
    kind: input.artifactKind === 'book' ? (zh ? '书籍' : 'book') : zh ? '论文' : 'paper'
  }
  const outlineSection = input.outline
    ? ['', `## ${label.outline}`, ...input.outline.sections.map((section, index) => `${index + 1}. ${section.heading[input.language]}`)]
    : []

  return [
    '---',
    `name: ${input.skillName}`,
    `kind: ${input.artifactKind}`,
    `source: ${input.sourceName}`,
    `language: ${input.language}`,
    '---',
    '',
    `# ${input.title[input.language]}`,
    '',
    `## ${label.usage}`,
    label.usageBody,
    ...outlineSection,
    '',
    `## ${label.pace}`,
    `- ${label.pages}`,
    `- ${label.budget}`,
    `- ${zh ? '来源类型' : 'Source kind'}: ${label.kind}`,
    ''
  ].join('\n')
}

const ANY_MENTION = /@([\p{L}\p{N}_-]*)/gu
const CARET_MENTION = /(?:^|\s)@([\p{L}\p{N}_-]*)$/u
const TRAILING_MENTION = /@[\p{L}\p{N}_-]*$/u

/** Every `@token` in the text, in the order typed. */
export function parseMentions(text: string): string[] {
  return [...text.matchAll(ANY_MENTION)].map((match) => match[1])
}

/** The `@token` the caret sits on, or null when it is not on one. */
export function caretMention(textUpToCaret: string): string | null {
  return CARET_MENTION.exec(textUpToCaret)?.[1] ?? null
}

/** Replaces the `@token` under the caret with a picked skill name. */
export function applyMentionToken(textUpToCaret: string, skillName: string): string {
  return textUpToCaret.replace(TRAILING_MENTION, `@${skillName} `)
}

/**
 * US-014: names the library holds and names it does not, so an unknown skill never passes as a
 * routing target. Both the composer hint and the answer text read this, so they cannot disagree.
 */
export function splitMentions(text: string, skills: Skill[]): { known: Skill[]; unknown: string[] } {
  const names = parseMentions(text)
  return {
    known: skills.filter((skill) => names.includes(skill.name)),
    unknown: names.filter((name) => !skills.some((skill) => skill.name === name))
  }
}
