import { defineStore } from 'pinia'
import { deleteBook } from '@/api/books'
import type { ArtifactKind, LocalizedText, Project, Skill, SkillFile } from '@/types'
import { isLocalizedText, verbatim } from '@/services/localized-text'
import { isPresent, readJson, writeJson } from '@/utils/storage'
import { uuid } from '@/utils/uuid'
import { skillFileName } from '@/services/skill'

const PROJECTS_KEY = 'lexforge:projects'
const SKILLS_KEY = 'lexforge:skills'
const DOWNLOADED_KEY = 'lexforge:downloaded-entries'

const ARTIFACT_KINDS: string[] = ['book', 'paper']

/** Disk is an external boundary: a hand-edited or truncated row is repaired before any view sees it. */
function repairSkill(raw: unknown): Skill | null {
  const skill = raw as Partial<Skill> | null
  if (!skill || typeof skill.id !== 'string' || typeof skill.name !== 'string') return null
  if (typeof skill.artifactKind !== 'string' || !ARTIFACT_KINDS.includes(skill.artifactKind)) return null
  const file = skill.file as Partial<SkillFile> | null
  if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') return null
  return {
    id: skill.id,
    name: skill.name,
    // Rows written before the backend existed carry no server identity, which is what null means.
    skillId: typeof skill.skillId === 'string' ? skill.skillId : null,
    bookId: typeof skill.bookId === 'string' ? skill.bookId : null,
    artifactKind: skill.artifactKind as ArtifactKind,
    title: isLocalizedText(skill.title) ? skill.title : verbatim(skill.name),
    pages: typeof skill.pages === 'number' ? skill.pages : 0,
    updatedAt: typeof skill.updatedAt === 'number' ? skill.updatedAt : Date.now(),
    file: { path: file.path, content: file.content }
  }
}

function repairProject(raw: unknown): Project | null {
  const project = raw as Partial<Project> | null
  if (!project || typeof project.id !== 'string' || typeof project.name !== 'string') return null
  const now = Date.now()
  return {
    id: project.id,
    name: project.name,
    bookId: typeof project.bookId === 'string' ? project.bookId : null,
    skillIds: Array.isArray(project.skillIds)
      ? project.skillIds.filter((id): id is string => typeof id === 'string')
      : [],
    createdAt: typeof project.createdAt === 'number' ? project.createdAt : now,
    updatedAt: typeof project.updatedAt === 'number' ? project.updatedAt : now
  }
}

function readStoredList<T>(key: string, repair: (raw: unknown) => T | null): T[] {
  const parsed = readJson(key)
  return Array.isArray(parsed) ? parsed.map(repair).filter(isPresent) : []
}

function readStoredIds(key: string): string[] {
  const parsed = readJson(key)
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
}

export const useProjectStore = defineStore('projects', {
  state: () => ({
    projects: readStoredList<Project>(PROJECTS_KEY, repairProject),
    skills: readStoredList<Skill>(SKILLS_KEY, repairSkill),
    downloadedEntryIds: readStoredIds(DOWNLOADED_KEY)
  }),

  getters: {
    takenNames: (state) => state.projects.map((project) => project.name),
    takenSkillNames: (state) => state.skills.map((skill) => skill.name)
  },

  actions: {
    /** Called once from bootstrap. `flush: post` keeps serialization out of the mutation batch. */
    startPersisting(): void {
      this.$subscribe(() => this.persistAll(), { deep: true, flush: 'post' })
    },

    /** Skill bodies are stored in full, so a refused write drops the oldest files and retries. */
    persistSkills(): void {
      if (this.skills.length === 0) {
        writeJson(SKILLS_KEY, [])
        return
      }
      for (let keep = this.skills.length; keep > 0; keep -= 1) {
        if (writeJson(SKILLS_KEY, this.skills.slice(this.skills.length - keep))) return
      }
      // Nothing fits: the in-memory list stays correct and the stale copy on disk is left alone.
      window.console.warn('[projects] skill files too large to keep on disk')
    },

    persistAll(): void {
      if (!writeJson(PROJECTS_KEY, this.projects)) window.console.warn('[projects] projects do not fit on disk')
      if (!writeJson(DOWNLOADED_KEY, this.downloadedEntryIds))
        window.console.warn('[projects] download list too large')
      this.persistSkills()
    },

    createProject(name: string, bookId: string | null = null): Project {
      const now = Date.now()
      const project: Project = { id: uuid(), name, bookId, skillIds: [], createdAt: now, updatedAt: now }
      this.projects.unshift(project)
      return project
    },

    /** The book id only exists after the upload answers, so the project is stamped afterwards. */
    setProjectBook(id: string, bookId: string): void {
      const project = this.projects.find((item) => item.id === id)
      if (project) project.bookId = bookId
    },

    renameProject(id: string, name: string): void {
      const project = this.projects.find((project) => project.id === id)
      if (project) {
        project.name = name
        project.updatedAt = Date.now()
      }
    },

    /** A project takes its skills with it; the skills themselves are never orphan-protected. */
    removeProject(id: string): Project | undefined {
      const project = this.projects.find((item) => item.id === id)
      if (!project) return undefined
      const owned = [...project.skillIds]
      this.projects = this.projects.filter((item) => item.id !== id)
      this.skills = this.skills.filter((skill) => !owned.includes(skill.id))
      return project
    },

    /**
     * §3.4: the local row goes first and always stays gone — the server is told afterwards, and a
     * refusal (the built-in `primer` cannot be deleted) never resurrects the project here.
     */
    async deleteProject(id: string): Promise<Project | undefined> {
      const project = this.removeProject(id)
      if (!project?.bookId) return project
      try {
        await deleteBook(project.bookId)
      } catch {
        // The interceptor already said what went wrong.
      }
      return project
    },

    removeSkill(id: string): Skill | undefined {
      const skill = this.skills.find((item) => item.id === id)
      if (!skill) return undefined
      this.skills = this.skills.filter((item) => item.id !== id)
      const owner = this.projects.find((project) => project.skillIds.includes(id))
      if (owner) {
        owner.skillIds = owner.skillIds.filter((item) => item !== id)
        owner.updatedAt = Date.now()
      }
      return skill
    },

    addSkill(
      projectId: string,
      input: {
        name: string
        skillId: string | null
        bookId: string | null
        artifactKind: ArtifactKind
        title: LocalizedText
        pages: number
        content: string
      }
    ): Skill {
      const now = Date.now()
      const skill: Skill = {
        id: uuid(),
        name: input.name,
        skillId: input.skillId,
        bookId: input.bookId,
        artifactKind: input.artifactKind,
        title: input.title,
        pages: input.pages,
        updatedAt: now,
        file: { path: `${input.name}/${skillFileName()}`, content: input.content }
      }
      this.skills.push(skill)
      const project = this.projects.find((project) => project.id === projectId)
      if (project) {
        project.skillIds.push(skill.id)
        project.updatedAt = now
      }
      return skill
    },

    skillsOf(projectId: string): Skill[] {
      const project = this.projects.find((item) => item.id === projectId)
      if (!project) return []
      return this.skills.filter((skill) => project.skillIds.includes(skill.id))
    },

    skillById(id: string): Skill | undefined {
      return this.skills.find((skill) => skill.id === id)
    },

    /** The editor route is nested under its project, so the library needs the reverse lookup. */
    projectOfSkill(skillId: string): Project | undefined {
      return this.projects.find((project) => project.skillIds.includes(skillId))
    },

    saveSkillContent(id: string, content: string): void {
      const skill = this.skills.find((item) => item.id === id)
      if (!skill) return
      const now = Date.now()
      skill.file.content = content
      skill.updatedAt = now
      const owner = this.projects.find((project) => project.skillIds.includes(id))
      if (owner) owner.updatedAt = now
    },

    markDownloaded(entryId: string): void {
      if (!this.downloadedEntryIds.includes(entryId)) this.downloadedEntryIds.push(entryId)
    },

    isDownloaded(entryId: string): boolean {
      return this.downloadedEntryIds.includes(entryId)
    }
  }
})
