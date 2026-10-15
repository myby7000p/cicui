import type { AppMessages } from '@/i18n/locales/zh-cn'

export const enUs: AppMessages = {
  app: {
    name: 'LexForge',
    brand: '辞萃',
    displayName: 'LexForge'
  },
  tagline: {
    topbar: 'Turn books & papers into knowledge, skills, and more',
    empty: 'Forge text and words into wisdom.\nDistill wisdom into reusable skills'
  },
  language: {
    label: 'Language'
  },
  theme: {
    label: 'Theme',
    system: 'System',
    light: 'Light',
    dark: 'Dark'
  },
  login: {
    title: 'Sign in',
    register: 'Sign up',
    username: 'Username',
    usernamePh: 'letters, digits, dot, underscore, hyphen',
    emailOptional: 'Email (optional)',
    emailPh: "you{'@'}example.com",
    password: 'Password',
    passwordPh: 'At least 6 characters',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    createAccount: 'Create account',
    busy: 'Submitting…',
    close: 'Close',
    lockedRetry: 'Try again in {seconds}s',
    error: {
      username: 'Username must be 3-32 letters, digits, dot, underscore or hyphen',
      email: 'That email address is not valid',
      password: 'The password needs at least 6 characters',
      mismatch: 'The two passwords do not match',
      network: 'Cannot reach the server — check your connection and try again',
      signIn: 'Sign-in failed — check your username and password',
      signUp: 'Sign-up failed — please try again later'
    }
  },
  header: {
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar'
  },
  window: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close'
  },
  http: {
    // Only transport failures are worded here; a business failure arrives with its own `message`.
    error: {
      network: 'Network connection failed — check your connection and try again',
      timeout: 'The request timed out — try again in a moment',
      status: 'Request failed ({code})'
    }
  },
  common: {
    cancel: 'Cancel',
    confirm: 'OK',
    close: 'Close',
    save: 'Save',
    start: 'Start',
    search: 'Search',
    download: 'Download'
  },
  nav: {
    newChat: 'New Chat',
    library: 'Library',
    projects: 'Projects',
    settings: 'Settings'
  },
  panel: {
    recent: 'Recent Chats',
    noChats: 'No conversations yet.',
    skills: 'Skills',
    back: 'Back',
    rename: 'Rename',
    rowActions: 'More actions',
    delete: 'Delete',
    chatDeleted: 'Conversation deleted',
    projectDeleted: 'Project deleted',
    skillDeleted: 'Skill “{name}” deleted',
    editSkills: 'Edit Skills',
    emptyProjects: 'No projects yet. One is created after an upload or a download.',
    emptySkills: 'This project has no skills yet'
  },
  account: {
    freePlan: 'Free Plan',
    paidPlan: 'Pro',
    freeNoRag: 'Free · no RAG',
    paidWithRag: 'Pro · RAG available',
    signIn: 'Sign in',
    signInNow: 'Sign in now',
    signOut: 'Sign out'
  },
  composer: {
    chat: 'Ask anything…',
    book: 'Type a book title, Enter returns the top 5',
    paper: 'Type a paper title, Enter searches Google Scholar',
    plus: 'Add',
    hint: 'Press Enter to send · Click + to upload a book or paper',
    rowBooks: 'Books',
    rowPapers: 'Papers',
    uploadBook: 'Upload Book',
    searchBook: 'Search Book',
    searchBookHint: 'via z-Library',
    uploadPaper: 'Upload Paper',
    searchPaper: 'Search Paper',
    searchPaperHint: 'via Google Scholar',
    formatsBook: 'pdf · epub · mobi',
    formatsPaper: 'pdf · word',
    plusSearchPh: 'Enter book or paper name to search…',
    searchBookPh: 'Search by book title…',
    searchPaperPh: 'Search by paper title…',
    cancelSearch: 'Leave search',
    mentionList: 'Skills to insert',
    mentionEmpty: 'No skills yet — upload a book or paper first.',
    mentionNoMatch: 'No skill matches that name.',
    mic: 'Voice input',
    stopVoice: 'Stop dictation',
    micDenied: 'Microphone access was denied',
    micMissing: 'No microphone found',
    micUnsupported: 'Recording is not available here'
  },
  progress: {
    title: 'Processing',
    paperSuffix: ' (paper)',
    stage: {
      queued: 'Queued, waiting to process…',
      extracting: 'Extracting text…',
      compiling: 'Compiling chapters…',
      generating: 'Generating the skill…',
      attaching: 'Adding to project…',
      completed: 'Done'
    }
  },
  card: {
    tabs: {
      overview: 'Overview',
      plan: 'Learning Plan',
      similar: 'Similar Books'
    },
    outlineTitle: 'Learning outline',
    planTitle: 'Study Plan',
    similarTitle: 'Similar Books',
    freeLimit: 'Free: max 5 downloads/day (00:00:01–00:00:00 Shanghai)',
    planRows: {
      pages: 'Total pages',
      weekday: 'Daily reading time',
      weekend: 'Weekend time',
      dailyPages: 'Pages per day',
      speed: 'Reading speed',
      speedValue: '{minutes} min/page',
      duration: 'Estimated duration',
      durationValue: '{days} days · {value} in total'
    },
    pagesPerDay: '{pages} pages / day',
    dayLabel: 'Day {day}',
    minutes: '{minutes} min',
    weekendTag: 'Weekend',
    pagesRange: 'pp {start}-{end}',
    showMore: 'Show {count} more days',
    showLess: 'Hide schedule',
    downloaded: 'Added to project',
    source: {
      'z-library': 'z-Library',
      'google-scholar': 'Google Scholar'
    },
    entryMeta: '{author} · {year} · {pages} pp'
  },
  search: {
    title: 'Search results',
    sub: 'Select up to 1 to download',
    subMailbox: 'Library mailbox: {email}',
    loading: 'Searching “{query}”…',
    notConfigured: 'No results right now — please try again in a moment.',
    failed: 'Search failed. Try again shortly.',
    retry: 'Retry',
    empty: 'Nothing matched. Try another title.'
  },
  projects: {
    title: 'Projects',
    newOne: 'New Project',
    skillCount: '{count} skills',
    updated: 'Updated {time}',
    deletedToast: 'Project “{name}” deleted',
    justNow: 'just now',
    minutesAgo: '{count} min ago',
    hoursAgo: '{count} h ago',
    daysAgo: '{count} d ago'
  },
  library: {
    title: 'Library',
    empty: 'Imported books and papers will appear here',
    emptyFiltered: 'No entries match this filter',
    filter: 'Type filter',
    filterAll: 'All',
    searchPh: 'Filter by title or skill name',
    kind: {
      book: 'Book',
      paper: 'Paper'
    },
    meta: '{kind} · {pages} pp · updated {time}'
  },
  settings: {
    title: 'Settings',
    account: 'Account',
    email: 'Email',
    emailNone: 'Not set',
    libraryMailbox: 'Library mailbox',
    changeMailbox: 'Change mailbox',
    unbindMailbox: 'Unbind',
    language: 'Language',
    theme: 'Theme',
    plan: 'Plan',
    model: 'Model',
    autoBest: 'Auto-select best model'
  },
  editor: {
    edit: 'Edit',
    preview: 'Preview',
    dirty: 'Unsaved',
    saving: 'Saving…',
    savedToast: 'Saved',
    savedLocalToast: 'Saved on this device',
    saveFailedToast: 'Could not save — your changes are kept on this device',
    exportPdf: 'Export PDF',
    exportWord: 'Export Word',
    exporting: 'Exporting…',
    empty: 'Pick a skill.md on the left to edit it'
  },
  dialog: {
    newProject: {
      title: 'New project',
      sub: 'The name can be changed later.',
      label: 'Project name',
      placeholder: 'e.g. The Psychology of Money',
      required: 'A project name is required',
      duplicate: 'That project name already exists'
    },
    skillName: {
      title: 'Name your skill',
      sub: 'Enter a name for the skill generated from this material.',
      label: 'Skill name',
      placeholder: 'e.g. The Psychology of Money',
      file: '{name} · {size} MB · about {pages} pages',
      required: 'A skill name is required',
      duplicate: 'That skill name already exists'
    },
    conflict: {
      title: 'This book already has a skill',
      sub: 'A usable skill already exists for “{name}”.',
      meta: 'Regenerating replaces the current version.',
      use: 'Use it',
      regenerate: 'Regenerate'
    },
    email: {
      title: 'Register z-Library account',
      changeTitle: 'Change library mailbox',
      current: 'Current mailbox: {email}',
      sub: 'An email is required to download books or papers.',
      label: 'Email address',
      placeholder: "you{'@'}example.com",
      invalid: 'That email address is not valid',
      legal: 'Your email will be used to download books or papers from the internet. You are solely responsible for the legality and use of all material obtained with this account.',
      legalAgree: 'I have read this and accept responsibility',
      legalRequired: 'Please confirm first',
      confirm: 'Register & Download'
    },
    rename: {
      title: 'Rename project',
      label: 'Project name',
      placeholder: 'Project name',
      required: 'A project name is required'
    },
    renameChat: {
      title: 'Rename conversation',
      label: 'Conversation name',
      placeholder: 'Conversation name',
      required: 'A conversation name is required'
    }
  }
}
