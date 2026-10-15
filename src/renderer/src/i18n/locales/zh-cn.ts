export const zhCn = {
  app: {
    name: 'LexForge',
    brand: '辞萃',
    displayName: '辞萃'
  },
  tagline: {
    topbar: '将书籍与论文转化为知识、技能与更多可能',
    empty: '萃万卷文辞，成知见文稿\n汲万卷之智，锻可用之技'
  },
  language: {
    label: '界面语言'
  },
  theme: {
    label: '主题',
    system: '跟随系统',
    light: '浅色模式',
    dark: '深色模式'
  },
  login: {
    title: '登录',
    register: '注册',
    username: '用户名',
    usernamePh: '字母、数字、点、下划线、短横线',
    emailOptional: '邮箱（选填）',
    emailPh: "you{'@'}example.com",
    password: '密码',
    passwordPh: '至少 6 位',
    confirmPassword: '确认密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    createAccount: '创建账号',
    busy: '正在提交…',
    close: '关闭',
    lockedRetry: '请 {seconds} 秒后重试',
    error: {
      username: '用户名需为 3-32 位字母、数字、点、下划线或短横线',
      email: '邮箱格式不正确',
      password: '密码至少 6 位',
      mismatch: '两次输入的密码不一致',
      network: '无法连接服务器，请检查网络或稍后重试',
      signIn: '登录失败，请检查用户名和密码',
      signUp: '注册失败，请稍后重试'
    }
  },
  header: {
    collapseSidebar: '折叠侧栏',
    expandSidebar: '展开侧栏'
  },
  window: {
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原',
    close: '关闭'
  },
  http: {
    // Only transport failures are worded here; a business failure arrives with its own `message`.
    error: {
      network: '网络连接失败，请检查网络后重试',
      timeout: '请求超时，请稍后重试',
      status: '请求失败（{code}）'
    }
  },
  common: {
    cancel: '取消',
    confirm: '确定',
    close: '关闭',
    save: '保存',
    start: '开始',
    search: '搜索',
    download: '下载'
  },
  nav: {
    newChat: '新建对话',
    library: '书库',
    projects: '项目',
    settings: '设置'
  },
  panel: {
    recent: '最近对话',
    noChats: '还没有对话。',
    skills: '技能',
    back: '返回',
    rename: '重命名',
    rowActions: '更多操作',
    delete: '删除',
    chatDeleted: '对话已删除',
    projectDeleted: '项目已删除',
    skillDeleted: '技能「{name}」已删除',
    editSkills: '编辑技能',
    emptyProjects: '还没有项目。导入或下载完成后会自动创建。',
    emptySkills: '这个项目还没有技能'
  },
  account: {
    freePlan: '免费版',
    paidPlan: '专业版',
    freeNoRag: '免费版 · 无 RAG',
    paidWithRag: '专业版 · 可开 RAG',
    signIn: '登录',
    signInNow: '立即登录',
    signOut: '退出登录'
  },
  composer: {
    chat: '有什么可以帮您的吗？',
    book: '输入书名后回车，返回前 5 个结果',
    paper: '输入论文标题后回车，直接搜 Google Scholar',
    plus: '添加',
    hint: '按 Enter 发送 · 点击 + 上传书籍或论文',
    rowBooks: '书籍（Books）',
    rowPapers: '论文（Papers）',
    uploadBook: '上传书籍',
    searchBook: '搜索书名',
    searchBookHint: '通过 z-Library 查找',
    uploadPaper: '上传论文',
    searchPaper: '搜索论文',
    searchPaperHint: '通过 Google Scholar',
    formatsBook: 'pdf · epub · mobi',
    formatsPaper: 'pdf · word',
    plusSearchPh: '输入书名或论文名搜索…',
    searchBookPh: '输入书名搜索…',
    searchPaperPh: '输入论文标题搜索…',
    cancelSearch: '退出搜索',
    mentionList: '可插入的技能',
    mentionEmpty: '还没有技能，先导入一本书或一篇论文。',
    mentionNoMatch: '没有匹配的技能。',
    mic: '语音输入',
    stopVoice: '停止语音输入',
    micDenied: '麦克风权限被拒，放开后重试',
    micMissing: '没有找到麦克风设备',
    micUnsupported: '当前环境不支持录音'
  },
  progress: {
    title: '处理中',
    paperSuffix: '（论文）',
    stage: {
      queued: '已入队，等待处理…',
      extracting: '正在抽取文本…',
      compiling: '正在整理章节…',
      generating: '正在生成技能…',
      attaching: '正在加入项目…',
      completed: '完成'
    }
  },
  card: {
    tabs: {
      overview: '概览',
      plan: '学习计划',
      similar: '相似书籍'
    },
    outlineTitle: '学习大纲',
    planTitle: '学习计划',
    similarTitle: '相似书籍',
    freeLimit: '免费版：每天最多下载 5 个成果（上海时间 00:00:01–00:00:00）',
    planRows: {
      pages: '总页数',
      weekday: '每日阅读时长',
      weekend: '周末时长',
      dailyPages: '每日页数',
      speed: '阅读速度',
      speedValue: '{minutes} 分钟/页',
      duration: '预计完成时长',
      durationValue: '{days} 天 · 共 {value}'
    },
    pagesPerDay: '{pages} 页 / 天',
    dayLabel: '第 {day} 天',
    minutes: '{minutes} 分钟',
    weekendTag: '周末',
    pagesRange: '{start}-{end} 页',
    showMore: '展开剩余 {count} 天',
    showLess: '收起日程',
    downloaded: '已加入项目',
    source: {
      'z-library': 'z-Library',
      'google-scholar': 'Google Scholar'
    },
    entryMeta: '{author} · {year} · {pages} 页'
  },
  search: {
    title: '搜索结果',
    sub: '最多选择 1 项下载',
    subMailbox: '书库邮箱：{email}',
    loading: '正在检索「{query}」…',
    notConfigured: '暂时检索不到结果，请稍后重试。',
    failed: '检索失败，请稍后重试。',
    retry: '重试',
    empty: '没有匹配的结果，换个书名或论文名再试。'
  },
  projects: {
    title: '项目',
    newOne: '新建项目',
    skillCount: '{count} 个技能',
    updated: '更新于 {time}',
    deletedToast: '项目「{name}」已删除',
    justNow: '刚刚',
    minutesAgo: '{count} 分钟前',
    hoursAgo: '{count} 小时前',
    daysAgo: '{count} 天前'
  },
  library: {
    title: '书库',
    empty: '导入的书籍与论文将出现在这里',
    emptyFiltered: '当前筛选条件下没有条目',
    filter: '类型筛选',
    filterAll: '全部',
    searchPh: '按书名或技能名筛选',
    kind: {
      book: '书籍',
      paper: '论文'
    },
    meta: '{kind} · {pages} 页 · 更新于 {time}'
  },
  settings: {
    title: '设置',
    account: '账号',
    email: '邮箱',
    emailNone: '未绑定',
    libraryMailbox: '书库邮箱',
    changeMailbox: '更换邮箱',
    unbindMailbox: '解绑',
    language: '语言',
    theme: '主题',
    plan: '版本',
    model: '模型',
    autoBest: '自动选择最佳模型'
  },
  editor: {
    edit: '编辑',
    preview: '预览',
    dirty: '未保存',
    saving: '正在保存…',
    savedToast: '已保存',
    savedLocalToast: '已保存到本地',
    saveFailedToast: '保存失败，改动已留在本地',
    exportPdf: '导出 PDF',
    exportWord: '导出 Word',
    exporting: '正在导出…',
    empty: '在左侧选择一个 skill.md 开始编辑'
  },
  dialog: {
    newProject: {
      title: '新建项目',
      sub: '项目名称可以随时改。',
      label: '项目名称',
      placeholder: '例如 金钱心理学',
      required: '项目名不能为空',
      duplicate: '这个项目名已经存在'
    },
    skillName: {
      title: '为技能命名',
      sub: '请输入由该资料生成的技能名称。',
      label: '技能名称',
      placeholder: '例如 金钱心理学',
      file: '{name} · {size} MB · 约 {pages} 页',
      required: '技能名不能为空',
      duplicate: '这个技能名已经存在'
    },
    conflict: {
      title: '这本书已经有技能了',
      sub: '「{name}」已经有一个可用技能。',
      meta: '重新生成会替换当前版本。',
      use: '直接使用',
      regenerate: '重新生成'
    },
    email: {
      title: '注册 z-Library 账号',
      changeTitle: '更换书库邮箱',
      current: '当前邮箱：{email}',
      sub: '下载书籍/论文需要提供邮箱。',
      label: '邮箱地址',
      placeholder: "you{'@'}example.com",
      invalid: '邮箱格式不正确',
      legal: '您的邮箱将用于从互联网下载书籍或论文；您须对使用该账号获取的全部资料的合法性与使用自行承担责任。',
      legalAgree: '我已阅读并承担上述责任',
      legalRequired: '需要先勾选确认',
      confirm: '注册并下载'
    },
    rename: {
      title: '重命名项目',
      label: '项目名称',
      placeholder: '项目名称',
      required: '项目名不能为空'
    },
    renameChat: {
      title: '重命名对话',
      label: '对话名称',
      placeholder: '对话名称',
      required: '对话名不能为空'
    }
  }
}

export type AppMessages = typeof zhCn
