import { defineStore } from 'pinia'
import type {
  ArtifactKind,
  ChatBlock,
  ChatConversation,
  ChatMessage,
  IngestionRun,
  LocalizedText,
  ReadingEntry,
  Skill,
  SourceFile,
  StudyPlanAssumptions
} from '@/types'
import type { Api } from '@/api/types'
import { BOOK_EXTENSIONS, BOOK_MAX_BYTES, fetchOutline } from '@/api/books'
import { LibrarySearchNotConfiguredError, searchEntries } from '@/api/library'
import { runStudy } from '@/api/study'
import { uuid } from '@/utils/uuid'
import { studyLangFromLanguage } from '@shared/language'
import {
  BookFailedError,
  SkillExistsError,
  generateForBook,
  readSkillMarkdown,
  regenerateFor,
  stageProgress,
  uploadAndProcess,
  type StageListener
} from '@/services/ingestion'
import { isLocalizedText, verbatim } from '@/services/localized-text'
import { router } from '@/router'
import { isPresent, readJson, writeJson } from '@/utils/storage'
import { buildStudyPlan } from '@/services/study-plan'
import { fileBaseName, parseMentions, proposeProjectName, skillMarkdown } from '@/services/skill'
import { useAccountStore } from '@/stores/account'
import { useLanguageStore } from '@/stores/language'
import { useProjectStore } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'

const WEEKDAY_HOURS = 1
const WEEKEND_HOURS = 2

/**
 * §3.3 lists one accepted set for the upload endpoint, and papers go through the same door.
 * The PRD asked for `mobi` and legacy `.doc`; the server takes neither, so the notice says what is
 * actually accepted rather than repeating the story.
 */
const PAPER_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.markdown'] as const

function allowedList(kind: ArtifactKind): string {
  return (kind === 'book' ? BOOK_EXTENSIONS : PAPER_EXTENSIONS).map((suffix) => suffix.slice(1)).join(' · ')
}

const CHATS_KEY = 'lexforge:conversations'
/** Threads live on disk, so a restart must not silently erase the user's history. */
const STORED_CHAT_LIMIT = 50
/** Progress runs are transient UI state: the newest few are enough. */
const STORED_RUN_LIMIT = 10

type SearchStatus = 'idle' | 'loading' | 'ready' | 'failed'

interface StoredChats {
  activeId: string
  conversations: ChatConversation[]
}

/**
 * The download a blocked mailbox step has to resume once the address arrives. A callback, not
 * reactive state, so it stays out of the store and out of DevTools.
 */
let afterEmail: (() => void) | null = null

/** The other half of the §5.1 dedupe dialog: the promise the running ingestion is waiting on. */
let conflictAnswer: ((useExisting: boolean) => void) | null = null

function quoteList(names: string[]): string {
  return names.map((name) => `"${name}"`).join(', ')
}

/** §4's answer is markdown, so it gets its own block rather than a plain bubble. */
function studyBlocks(result: Api.StudyResult): ChatBlock[] {
  return [{ kind: 'markdown', text: verbatim(result.markdown) }]
}

function draftConversation(): ChatConversation {
  return {
    id: uuid(),
    title: { 'zh-cn': '新对话', 'en-us': 'New chat' },
    messages: [],
    skillMention: []
  }
}

const BLOCK_KINDS: string[] = ['text', 'markdown', 'outline', 'study-plan', 'entry-list', 'notice']

/**
 * Disk is an external boundary: a truncated or hand-edited entry gets repaired field by field
 * instead of being trusted and written straight back, which is how one bad row would otherwise
 * poison every later launch.
 */
function repairBlock(raw: unknown): ChatBlock | null {
  const block = raw as Partial<ChatBlock> | null
  if (!block || typeof block.kind !== 'string' || !BLOCK_KINDS.includes(block.kind)) return null
  // The message row dereferences a text block's copy, so that one has to arrive complete.
  if (block.kind === 'text' && !isLocalizedText(block.text)) return null
  return block as ChatBlock
}

function repairMessage(raw: unknown): ChatMessage | null {
  const message = raw as Partial<ChatMessage> | null
  if (!message || typeof message.id !== 'string') return null
  if (message.role !== 'user' && message.role !== 'assistant') return null
  return {
    id: message.id,
    role: message.role,
    createdAt: typeof message.createdAt === 'number' ? message.createdAt : Date.now(),
    blocks: Array.isArray(message.blocks) ? message.blocks.map(repairBlock).filter(isPresent) : []
  }
}

function repairConversation(raw: unknown): ChatConversation | null {
  const conversation = raw as Partial<ChatConversation> | null
  if (!conversation || typeof conversation.id !== 'string') return null
  return {
    id: conversation.id,
    title: isLocalizedText(conversation.title) ? conversation.title : draftConversation().title,
    messages: Array.isArray(conversation.messages) ? conversation.messages.map(repairMessage).filter(isPresent) : [],
    skillMention: Array.isArray(conversation.skillMention)
      ? conversation.skillMention.filter((name): name is string => typeof name === 'string')
      : []
  }
}

function readStoredChats(): StoredChats {
  const parsed = readJson(CHATS_KEY) as Partial<StoredChats> | null
  const stored = parsed?.conversations
  const conversations = (Array.isArray(stored) ? stored : []).map(repairConversation).filter(isPresent)
  if (conversations.length > 0) {
    const active = conversations.find((item) => item.id === parsed?.activeId)
    return { activeId: active?.id ?? conversations[0].id, conversations }
  }
  // First launch or an unreadable payload: one empty thread is the correct answer either way.
  const conversation = draftConversation()
  return { activeId: conversation.id, conversations: [conversation] }
}

export const useChatStore = defineStore('chat', {
  state: () => {
    const stored = readStoredChats()
    return {
      conversations: stored.conversations,
      activeConversationId: stored.activeId,
      runs: [] as IngestionRun[],
      searchKind: null as ArtifactKind | null,
      /** A picked file whose skill still needs a name (US-011). `file` is the upload payload. */
      pendingUpload: null as { kind: ArtifactKind; meta: SourceFile; file: File } | null,
      emailDialogOpen: false,
      /** §5.1: a book that already has a skill parks here until 直接使用 / 重新生成 is clicked. */
      conflictPrompt: null as { bookId: string; skill: Api.SkillView } | null,
      /** Search replies live in a modal, not in the message list, so the chat stays readable. */
      searchResults: null as { kind: ArtifactKind; entries: ReadingEntry[] } | null,
      searchStatus: 'idle' as SearchStatus,
      /** The dialog names the query it is showing results for, and retry needs it back. */
      searchQuery: '',
      /** The retrieval seam failing for lack of a service is a different message from finding nothing. */
      searchNotConfigured: false
    }
  },

  getters: {
    activeConversation(state): ChatConversation {
      return state.conversations.find((item) => item.id === state.activeConversationId) ?? state.conversations[0]
    },

    /** The progress modal shows the newest run that has not reached `completed`. */
    runningRun(state): IngestionRun | null {
      return [...state.runs].reverse().find((run) => run.stage !== 'completed') ?? null
    }
  },

  actions: {
    /** Called once from bootstrap. `flush: post` keeps serialization out of the mutation batch. */
    startPersisting(): void {
      this.$subscribe(() => this.persistChats(), { deep: true, flush: 'post' })
    },

    /** The newest thread is first, so a refused write drops from the tail and retries. */
    persistChats(): void {
      const keep = Math.min(this.conversations.length, STORED_CHAT_LIMIT)
      for (let count = keep; count > 0; count -= 1) {
        const payload: StoredChats = {
          activeId: this.activeConversationId,
          conversations: this.conversations.slice(0, count)
        }
        // Generated skill text lives inside the messages, so the history can outgrow the quota.
        if (writeJson(CHATS_KEY, payload)) return
      }
      window.console.warn('[chat] history too large to keep on disk')
    },

    activeRun(id: string): IngestionRun | undefined {
      return this.runs.find((run) => run.id === id)
    },

    /** Every thread has one address, so the route is the truth and the store just follows it. */
    openConversation(id: string): void {
      if (!this.conversations.some((item) => item.id === id)) return
      this.activeConversationId = id
      void router.push({ name: 'chat-conversation', params: { conversationId: id } })
    },

    /** Brings the chat view forward from another view without leaving a bare `/chat` in history. */
    showActiveConversation(): void {
      void router.push({ name: 'chat-conversation', params: { conversationId: this.activeConversationId } })
    },

    newConversation(): void {
      const existing = this.conversations.find((item) => item.id === this.activeConversationId)
      if (existing && existing.messages.length === 0) {
        // Already on an empty thread: going back to it must not spawn a second one.
        this.openConversation(existing.id)
        return
      }
      const conversation = draftConversation()
      this.conversations.unshift(conversation)
      this.openConversation(conversation.id)
    },

    /** N-03: starting a chat is also how the prototype leaves every other view. */
    startNewChat(): void {
      this.newConversation()
      useUiStore().closeSidebar()
    },

    selectConversation(id: string): void {
      this.openConversation(id)
    },

    /**
     * A deep link, a reload or the back/forward buttons all land here. `/chat` carries no thread and
     * neither does an unknown id: both get rewritten onto the thread actually on screen, so the
     * address never disagrees with the view and the history entry stays usable.
     */
    syncConversationFromRoute(conversationId?: string): void {
      if (conversationId && this.conversations.some((item) => item.id === conversationId)) {
        this.activeConversationId = conversationId
        return
      }
      void router.replace({
        name: 'chat-conversation',
        params: { conversationId: this.activeConversationId }
      })
    },

    renameConversation(id: string, title: string): void {
      const conversation = this.conversations.find((item) => item.id === id)
      const name = title.trim()
      if (!conversation || !name) return
      conversation.title = verbatim(name.slice(0, 28))
    },

    removeConversation(id: string): void {
      this.conversations = this.conversations.filter((item) => item.id !== id)
      if (this.conversations.length === 0) this.conversations = [draftConversation()]
      // Deleting the thread on screen has to move the address too, otherwise it points at nothing.
      if (this.activeConversationId === id) this.openConversation(this.conversations[0].id)
    },

    titleIfNeeded(text: string): void {
      const conversation = this.activeConversation
      if (!conversation || conversation.messages.length > 0) return
      conversation.title = verbatim(text.slice(0, 28))
    },

    pushMessage(role: 'user' | 'assistant', blocks: ChatBlock[]): ChatMessage {
      let conversation = this.activeConversation
      if (!conversation) {
        conversation = draftConversation()
        this.conversations.unshift(conversation)
        this.activeConversationId = conversation.id
      }
      conversation.messages.push({ id: uuid(), role, createdAt: Date.now(), blocks })
      // Read back through the reactive proxy so later mutations of blocks are tracked.
      return conversation.messages[conversation.messages.length - 1]
    },

    /** The plan card edits the assumptions stored inside its own message block. */
    updatePlanAssumptions(messageId: string, assumptions: StudyPlanAssumptions): void {
      for (const conversation of this.conversations) {
        const block = conversation.messages
          .find((message) => message.id === messageId)
          ?.blocks.find((item) => item.kind === 'study-plan')
        if (block?.kind === 'study-plan') {
          block.assumptions = assumptions
          return
        }
      }
    },

    startSearch(kind: ArtifactKind): void {
      this.searchKind = kind
    },

    cancelSearch(): void {
      this.searchKind = null
    },

    requestLibraryEmail(action: () => void): void {
      afterEmail = action
      this.emailDialogOpen = true
    },

    confirmLibraryEmail(email: string): void {
      useAccountStore().registerLibrary(email)
      this.emailDialogOpen = false
      const resume = afterEmail
      afterEmail = null
      resume?.()
    },

    abandonLibraryEmail(): void {
      this.emailDialogOpen = false
      afterEmail = null
    },

    /** Settings offers this as the way to move to another mailbox. */
    openLibraryEmailDialog(): void {
      afterEmail = null
      this.emailDialogOpen = true
    },

    submit(text: string): void {
      const trimmed = text.trim()
      if (!trimmed) return
      const kind = this.searchKind
      if (kind) {
        this.searchKind = null
        void this.searchByName(trimmed, kind)
        return
      }
      this.ask(trimmed)
    },

    /**
     * US-014: a mentioned skill answers through §4. The paywall from US-015 stays out of this path on
     * purpose — the backend has no RAG endpoint yet and `plan` is always `free`, so gating here would
     * make the one working question path untestable for everyone.
     */
    async ask(text: string): Promise<void> {
      const repository = useProjectStore()
      const language = useLanguageStore()
      this.titleIfNeeded(text)
      const mentions = parseMentions(text)
      const conversation = this.activeConversation
      if (conversation) conversation.skillMention = mentions
      this.pushMessage('user', [{ kind: 'text', text: verbatim(text) }])
      if (mentions.length === 0) {
        this.pushMessage('assistant', [
          {
            kind: 'notice',
            tone: 'info',
            title: { 'zh-cn': '没有 @ 技能', 'en-us': 'No skill mentioned' },
            detail: {
              'zh-cn': '输入 @ 选择一个技能，回答会依据那本书的内容。',
              'en-us': 'Type @ to pick a skill, and the answer follows that book.'
            }
          }
        ])
        return
      }
      // Only skills that came back from a server book can answer: §4 addresses the book, not the row.
      const targets = repository.skills.filter(
        (item): item is Skill & { bookId: string } => mentions.includes(item.name) && !!item.bookId
      )
      if (targets.length === 0) {
        this.pushMessage('assistant', [this.noServerBookNotice(mentions)])
        return
      }

      const pending = this.pushMessage('assistant', [
        {
          kind: 'text',
          text: {
            'zh-cn': `正在向${mentions.map((name) => `「${name}」`).join('')}研习…`,
            'en-us': `Asking ${quoteList(mentions)}…`
          }
        }
      ])
      try {
        const results = await Promise.all(
          targets.map((skill) =>
            runStudy({
              book_id: skill.bookId,
              action: 'distill',
              ui_lang: studyLangFromLanguage(language.current)
            })
          )
        )
        // The answer is a pass over the whole book, so label it as that instead of leaving it to
        // read as a reply to whatever sentence was typed.
        pending.blocks.splice(0, pending.blocks.length,
          {
            kind: 'text',
            text: {
              'zh-cn': `下面是${mentions.map((name) => `「${name}」`).join('')}这本书的要点提炼：`,
              'en-us': `Here is the distillation of ${quoteList(mentions)}:`
            }
          },
          ...results.map(studyBlocks).flat()
        )
      } catch (cause) {
        // Whatever the engine said goes to the console; the bubble only carries customer copy.
        window.console.error('[study] request failed', cause instanceof Error ? cause.message : cause)
        pending.blocks.splice(0, pending.blocks.length, {
          kind: 'notice',
          tone: 'warning',
          title: { 'zh-cn': '这次提问没成功', 'en-us': 'The question did not go through' },
          detail: {
            'zh-cn': '这本书暂时问不了，请稍后再试一次。',
            'en-us': 'This book cannot be queried right now. Try again in a moment.'
          }
        })
      }
    },

    noServerBookNotice(names: string[]): ChatBlock {
      return {
        kind: 'notice',
        tone: 'warning',
        title: { 'zh-cn': '这些技能暂时问不了', 'en-us': 'Those skills cannot be queried yet' },
        detail: {
          'zh-cn': `${quoteList(names)} 只有本机记录，没有可依据的书籍内容，重新导入这本书后才能提问。`,
          'en-us': `${quoteList(names)} only exist on this device, with no book content to answer from. Import the book again to ask it.`
        }
      }
    },

    /** US-060 / US-062: search by name only, books still pass the z-Library email step first. */
    async searchByName(query: string, kind: ArtifactKind): Promise<void> {
      if (kind === 'book' && !useAccountStore().libraryEmail) {
        this.requestLibraryEmail(() => void this.searchByName(query, kind))
        return
      }
      this.titleIfNeeded(query)
      this.pushMessage('user', [{ kind: 'text', text: verbatim(query) }])
      this.showActiveConversation()
      await this.runSearch(query, kind)
    },

    /** The dialog opens on the loading state so the wait is visible, then shows what came back. */
    async runSearch(query: string, kind: ArtifactKind): Promise<void> {
      this.searchQuery = query
      this.searchResults = { kind, entries: [] }
      this.searchStatus = 'loading'
      this.searchNotConfigured = false
      try {
        const entries = await searchEntries(query, kind)
        this.searchResults = { kind, entries }
        this.searchStatus = 'ready'
      } catch (error) {
        this.searchNotConfigured = error instanceof LibrarySearchNotConfiguredError
        this.searchStatus = 'failed'
      }
    },

    /** Retry re-runs the query the dialog is showing, without a second copy in the thread. */
    retrySearch(): void {
      const kind = this.searchResults?.kind
      if (!kind || !this.searchQuery) return
      void this.runSearch(this.searchQuery, kind)
    },

    closeSearchResults(): void {
      this.searchResults = null
      this.searchStatus = 'idle'
      this.searchNotConfigured = false
    },

    /** Plus-panel search: an explicit kind from the chosen card wins over the keyword guess. */
    searchFromPlusInput(query: string, kind?: ArtifactKind): void {
      const trimmed = query.trim()
      if (!trimmed) return
      const picked = kind ?? (/\b(pdf|paper|论文|journal|arxiv)\b/i.test(trimmed) ? 'paper' : 'book')
      void this.searchByName(trimmed, picked)
    },

    /** US-010 / US-011: the file has to be a format the upload endpoint takes, then naming is next. */
    pickFile(kind: ArtifactKind, file: File): boolean {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
      const allowed: readonly string[] = kind === 'book' ? BOOK_EXTENSIONS : PAPER_EXTENSIONS
      if (!allowed.includes(extension) || file.size > BOOK_MAX_BYTES) {
        this.pushMessage('assistant', [this.unsupportedFileNotice(kind, extension, file.size)])
        return false
      }
      this.showActiveConversation()
      this.pendingUpload = {
        kind,
        file,
        meta: {
          name: file.name,
          extension: extension.slice(1),
          sizeMb: Number((file.size / 1024 / 1024).toFixed(1)),
          // §3.1 gives chapter counts, never pages, so the plan card starts from a size estimate.
          pages: this.estimatePages(file.size)
        }
      }
      return true
    },

    unsupportedFileNotice(kind: ArtifactKind, extension: string, sizeInBytes: number): ChatBlock {
      const tooBig = sizeInBytes > BOOK_MAX_BYTES
      return {
        kind: 'notice',
        tone: 'warning',
        title: tooBig
          ? { 'zh-cn': '文件超过上限', 'en-us': 'File is too large' }
          : { 'zh-cn': '格式不支持', 'en-us': 'Unsupported format' },
        detail: tooBig
          ? {
              'zh-cn': `单个文件最大 80 MB，这个文件 ${(sizeInBytes / 1024 / 1024).toFixed(1)} MB。`,
              'en-us': `One file can be up to 80 MB; this one is ${(sizeInBytes / 1024 / 1024).toFixed(1)} MB.`
            }
          : {
              'zh-cn': `不支持 ${extension} 文件。${kind === 'book' ? '书籍' : '论文'}可用：${allowedList(kind)}。`,
              'en-us': `${extension} files are not supported. ${kind === 'book' ? 'Books' : 'Papers'} accept: ${allowedList(kind)}.`
            }
      }
    },

    /** Only the renderer sees the file, so page count is a size-based guess the plan card can edit. */
    estimatePages(sizeInBytes: number): number {
      return Math.max(20, Math.round(sizeInBytes / 1024 / 900))
    },

    cancelUpload(): void {
      this.pendingUpload = null
    },

    confirmSkillName(skillName: string): void {
      const upload = this.pendingUpload
      if (!upload) return
      const repository = useProjectStore()
      this.pendingUpload = null
      const name = skillName.trim()
      const title = verbatim(fileBaseName(upload.meta.name))
      this.pushMessage('user', [{ kind: 'text', text: verbatim(upload.meta.name) }])
      const project = repository.createProject(proposeProjectName(title, repository.takenNames))
      void this.runIngestion({
        kind: upload.kind,
        skillName: name,
        projectId: project.id,
        title,
        sourceName: upload.meta.name,
        pages: upload.meta.pages,
        file: upload.file
      })
    },

    /** US-061 / N-14: one download from the result list. */
    downloadEntry(entry: ReadingEntry): void {
      const kind: ArtifactKind = entry.source === 'z-library' ? 'book' : 'paper'
      const account = useAccountStore()
      if (kind === 'book' && !account.libraryEmail) {
        this.requestLibraryEmail(() => this.downloadEntry(entry))
        return
      }
      // §0 of the contract: z-Library / Google Scholar retrieval is not implemented upstream, so this
      // stops with what the server actually has and runs no pretend pipeline.
      this.pushMessage('assistant', [this.sourceNotReadyNotice(entry)])
    },

    sourceNotReadyNotice(entry: ReadingEntry): ChatBlock {
      const title = entry.title['zh-cn']
      return {
        kind: 'notice',
        tone: 'info',
        title: { 'zh-cn': '这本书暂时下载不了', 'en-us': 'This book is not available to download' },
        detail: {
          'zh-cn': `暂时取不到「${title}」的文件，把手上的文件直接上传就可以开始。`,
          'en-us': `"${title}" could not be fetched right now. Upload a file you already have to get started.`
        }
      }
    },

    projectName(projectId: string): string {
      return useProjectStore().projects.find((project) => project.id === projectId)?.name ?? ''
    },

    /** US-012 / US-020 / US-021: upload → poll → generate → read back, then the cards land. */
    async runIngestion(input: {
      kind: ArtifactKind
      skillName: string
      projectId: string
      title: LocalizedText
      sourceName: string
      pages: number
      file: File
    }): Promise<void> {
      const repository = useProjectStore()
      const language = useLanguageStore()
      const skillName = input.skillName || `skill-${Date.now().toString(36)}`
      this.runs.push({
        id: uuid(),
        fileName: input.sourceName,
        artifactKind: input.kind,
        skillName,
        stage: 'queued',
        progress: stageProgress('queued')
      })
      const run = this.runs[this.runs.length - 1]
      // Runs only feed the progress modal, so the finished ones do not pile up for the whole session.
      if (this.runs.length > STORED_RUN_LIMIT) this.runs.splice(0, this.runs.length - STORED_RUN_LIMIT)
      const onStage: StageListener = (stage) => {
        run.stage = stage
        run.progress = stageProgress(stage)
      }

      let book: Api.BookCard
      let skill: Api.SkillView
      let markdown: string
      try {
        book = await uploadAndProcess({ file: input.file, title: input.title['zh-cn'] }, onStage)
        repository.setProjectBook(input.projectId, book.id)
        skill = await this.ensureSkill(book.id, onStage)
        markdown = await readSkillMarkdown(skill, onStage)
      } catch (cause) {
        // The modal has nothing to show for a book that never arrived, and the thread says why.
        this.runs = this.runs.filter((item) => item.id !== run.id)
        this.pushMessage('assistant', [this.ingestionNotice(cause)])
        return
      }

      const assumptions = {
        readingLanguage: language.current,
        pages: input.pages,
        weekdayHours: WEEKDAY_HOURS,
        weekendHours: WEEKEND_HOURS
      }
      const plan = buildStudyPlan(assumptions)
      repository.addSkill(input.projectId, {
        name: skillName,
        skillId: skill.id,
        bookId: book.id,
        artifactKind: input.kind,
        title: input.title,
        pages: input.pages,
        // The server's own text is the file now; the local template only fills an empty body.
        content: markdown || skillMarkdown({
          skillName,
          sourceName: input.sourceName,
          artifactKind: input.kind,
          title: input.title,
          plan: assumptions,
          minutesPerPage: plan.minutesPerPage,
          language: language.current
        })
      })
      run.stage = 'completed'
      run.progress = stageProgress('completed')

      this.showActiveConversation()
      this.pushMessage('assistant', [
        {
          kind: 'text',
          text: {
            'zh-cn': `技能「${skillName}」已生成，并加入项目「${this.projectName(input.projectId)}」。`,
            'en-us': `Skill "${skillName}" is ready and attached to project "${this.projectName(input.projectId)}".`
          }
        },
        ...(await this.outlineBlock(book)),
        { kind: 'study-plan', assumptions }
      ])
    },

    /** §5.1: a book that already has a skill asks the user instead of silently making a second one. */
    async ensureSkill(bookId: string, onStage: StageListener): Promise<Api.SkillView> {
      try {
        return await generateForBook(bookId, onStage)
      } catch (cause) {
        if (!(cause instanceof SkillExistsError)) throw cause
        const useExisting = await this.askConflict(cause.skill)
        if (useExisting) {
          onStage('attaching')
          return cause.skill
        }
        return await regenerateFor(cause.skill.id, onStage)
      }
    },

    /** The dialog resolves this; dismissing it counts as 直接使用, which destroys nothing. */
    askConflict(skill: Api.SkillView): Promise<boolean> {
      this.conflictPrompt = { bookId: skill.book_id, skill }
      return new Promise((resolve) => {
        conflictAnswer = (useExisting) => {
          conflictAnswer = null
          resolve(useExisting)
        }
      })
    },

    resolveConflict(useExisting: boolean): void {
      this.conflictPrompt = null
      conflictAnswer?.(useExisting)
    },

    /** §3.5 turned into the 概览 tab; a book with no chapters simply gets no tab. */
    async outlineBlock(book: Api.BookCard): Promise<ChatBlock[]> {
      try {
        const outline = await fetchOutline(book.id)
        if (outline.chapters.length === 0) return []
        return [
          {
            kind: 'outline',
            sourceTitle: verbatim(book.title),
            subtitle: {
              'zh-cn': `${book.chapter_count} 章`,
              'en-us': `${book.chapter_count} chapters`
            },
            outline: {
              title: { 'zh-cn': '学习大纲', 'en-us': 'Learning outline' },
              sections: outline.chapters.map((chapter) => ({
                heading: verbatim(chapter.title),
                points: []
              }))
            }
          }
        ]
      } catch {
        // An outline is a bonus on top of the skill that already landed; do not fail the run for it.
        return []
      }
    },

    /** Engine and transport text stays in the console; the thread only ever gets customer copy. */
    ingestionNotice(cause: unknown): ChatBlock {
      const reason = cause instanceof Error ? cause.message : String(cause)
      if (cause instanceof BookFailedError) {
        window.console.error('[ingestion] book failed', cause.bookId, reason)
        return {
          kind: 'notice',
          tone: 'warning',
          title: { 'zh-cn': '这本书处理失败', 'en-us': 'The book failed to process' },
          detail: {
            'zh-cn': '这本书没能处理完成，请换个格式或另一份文件再试。',
            'en-us': 'This file could not be processed. Try another file or a different format.'
          }
        }
      }
      window.console.error('[ingestion] run stopped', reason)
      return {
        kind: 'notice',
        tone: 'warning',
        title: { 'zh-cn': '导入没走完', 'en-us': 'Import did not finish' },
        detail: {
          'zh-cn': '导入没有完成，这本书没有加入项目，请重新导入。',
          'en-us': 'The import stopped, so this book was not added. Please import it again.'
        }
      }
    },
  }
})
