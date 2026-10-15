# LexForge（辞萃）

Electron + Vue 3 + TypeScript 桌面客户端，面向 Windows 与 macOS。

> 萃万卷文辞，成知见文稿；汲万卷之智，锻可用之技。
> Forge text and words into wisdom. Distill wisdom into reusable skills.

每个目录和文件具体负责什么，见 [目录说明.md](./目录说明.md)。

## 命令

```bash
npm install        # 首次会顺带补齐 Electron 二进制（走 .npmrc 里的镜像）
npm run dev        # 带热更新的开发窗口
npm run typecheck  # 主进程 + 渲染进程类型检查
npm run build      # 产出 out/
npm run dist:win   # Windows：NSIS 安装包 + portable（在 Windows 上执行）
npm run dist:mac   # macOS：dmg + zip（必须在 macOS 上执行）
```

局域网访问：`electron.vite.config.ts` 里 `renderer.server.host` 已经是 `true`，dev server 监听 `0.0.0.0:5173`，同一网段的设备直接开 `http://<本机IP>:5173` 就能看（第一次要在 Windows 防火墙里放行 Node 的专用网络）。桌面端仍走 `http://localhost:5173`，不受这条影响。注意这个地址是**非安全上下文**：`crypto.randomUUID` 不存在（id 由 `utils/uuid.ts` 自己拼 v4）、麦克风 `navigator.mediaDevices` 拿不到（`use-dictation.ts:23` 已经判空并给提示），窗口控制按钮也没有——`window.lexforge` 那座 IPC 桥只在 Electron 里存在。

macOS 的 `.icns` 生成与签名依赖 macOS 工具链，Windows 上无法代劳。没有开发者证书时跳过签名：

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
```

给客户的安装包怎么签名、公证、过 SmartScreen / Gatekeeper，以及 CI 出包流程，见 [打包发布.md](./打包发布.md)。

所有运行时依赖都放在 `devDependencies`：渲染进程与主进程代码都由 Vite 打包，`app.asar` 只含 `out/`。

## 路由

视图切换走 vue-router 5 的 **hash 模式**（`createWebHashHistory`）：打包后渲染进程从 `file://` 加载，`createWebHistory` 的干净路径会被当成本地文件去找而白屏，hash 在 dev 与安装包里的深链都能用。

| 路径 | 视图 |
| --- | --- |
| `/chat` | 对话（启动落这里） |
| `/chat/:conversationId` | 打开某条已有对话（有历史的消息才会拿到自己的地址，刷新 / 前进后退都回到同一条） |
| `/library` | 书库 |
| `/projects` | 项目列表 |
| `/projects/:projectId/skills` | 项目列表 + 右侧技能列 |
| `/projects/:projectId/skills/:skillId` | 技能编辑器 + 右侧技能列 |
| `/settings` | 设置 |

`meta.nav` 决定侧栏哪一项高亮，未知路径重定向回 `/chat`；`route.meta.nav` 也决定 US-004 的侧栏自动显隐——离开对话视图且窗口够宽就自动展开，回到对话就自动收起。登录**不是路由**：`stores/ui.ts` 的 `loginOpen` 一翻起来，`App.vue` 就在当前视图上挂出 `LoginDialog`，半透明遮罩底下还是你正在看的那页，叉号 / `Esc` / 点遮罩都能关掉——登录不做强制，未登录照样浏览全部视图（启动时若有会话就直接把账号读回 `stores/account.ts`）。

## 界面实现

不用组件库：对话页的控件都很轻，Element Plus 的默认样式反而压不住场。按钮、标签、输入框、开关、顶栏分段、侧栏导航、锚定菜单、弹窗（`m-field / m-legal / m-btns`）、搜索结果行、进度条与阶段圆点、推荐行（`rec-item`）、结果卡（封面 + tab）、学习计划框、数字步进器、复选框、编辑器下划线 tab、设置行、Toast 全部手写，集中在 `assets/ui.css`，设计变量在 `assets/main.css`（配色对齐 `LexForge-辞萃-UI-Prototype.html`：`#4f5ef7` 主色 + 扁平表面 + 14/16px 圆角）。图标是 `components/ui/AppIcon.vue` 里的一张 SVG path 表；品牌标志用 `src/renderer/src/assets/logo.svg`（侧栏 + 首页空态），`resources/icon.png` 由它栅格化到浅色圆角底板上生成——标志里的藏青在深色背景下会糊掉，所以深色主题的 logo 都垫了浅色底衬。同一个 `resources/icon.png` 既给 electron-builder 出 `.ico` / `.icns`，也在主进程里以 `?asset` 引给 `BrowserWindow({ icon })`（Windows 标题栏）和 `app.dock.setIcon`（macOS 程序坞）；浏览器标签页的图标是 `src/renderer/public/logo.svg`（把标志放进 640×640 方框居中）。

只有三处需要 JS 逻辑：`ui/AppModal.vue`（遮罩 + Esc + 点外部关闭）、`ui/AppToast.vue` 配 `composables/use-toast.ts`、`composables/use-menu.ts`（全局同时只开一个锚定菜单，触发器和面板都要在带 `data-menu-root` 的元素里；「+」面板用 `Teleport` 挂到 body 再居中）。

## 界面语言

- 枚举 `UserPreferredLanguage = 'zh-cn' | 'en-us'`，定义在 `src/shared/language.ts`。
- 默认语言取本机系统语言（`src/main/services/language.ts` 读 `app.getSystemLocale()`）：`zh*` → `zh-cn`，其余 → `en-us`。运行时不请求任何第三方站点，离线也能判定。
- 用浏览器直接开 `localhost:5173` 调试时没有 preload 桥（`window.lexforge` 不存在），改取 `navigator.language` 走同一条 `zh*` 判定，所以中文浏览器打开就是中文，不会掉到英文兜底。
- 顶栏右上角常驻中 / 英切换（不依赖首页），设置页的语言行是同一个 store 的另一个入口；用户主动切换写 `localStorage`（键 `lexforge:preferred-language`），重启还是那个语言。系统语言默认值不算用户选择，因此不会写入。
- 语言状态同时驱动 `<html lang>` 和全部界面文案（`src/renderer/src/stores/language.ts`），数据类文案（书名、简介、大纲）自带中英两份，切换时已渲染的消息也会跟着翻译。
- 显示名按语言走：中文一律「辞萃」，英文才用「LexForge」——窗口标题（`document.title`）、侧栏品牌、托盘 tooltip 与「退出」菜单项都取 `app.displayName`。侧栏与首页空态的 `LexForge / 辞萃` 是双语 logo 组合，不受这条影响。
- 主题跟随系统 `prefers-color-scheme`，也可在顶栏切浅色 / 深色 / 跟随系统；选择落 `localStorage`（键 `lexforge:theme`），重启不会被系统颜色顶回去。
- 托盘菜单（显示主窗口 / 退出）不在渲染进程里，所以 `stores/language.ts` 每次定语言都 `window.lexforge.setLanguage()` 同步给主进程重建菜单。

## 已实现页面

| 范围 | 位置 |
| --- | --- |
| 外壳：横跨窗口顶部的 40px 标题栏（左端汉堡 + 页面自绘的最小化/最大化/关闭，Windows 无边框所以整条都是 DOM，弹窗遮罩能连按钮一起压暗）、侧栏顶部是 logo + 品牌、下面是导航，侧栏默认收起、导航为 新建对话 / 书库 / 项目（没有「首页」——它和「新建对话」是同一个动作），底部是账号行 + 设置齿轮 + 免费版与 `0/0` 槽位（退出登录在个人信息弹窗里） | `App.vue`、`SidePanel.vue`、`src/main/index.ts`、`src/main/ipc.ts` |
| 顶栏（标题栏下面那行）：单行标语（超长省略）、`中 / EN` 与 `跟随系统 / 浅色 / 深色` 分段控件，「新建对话」仅在侧栏收起时出现 | `AppHeader.vue` |
| 首页空态：logo + `LexForge 辞萃` + 两行标语；单行胶囊输入框（+ / 语音 / 发送） | `StartScreen.vue`、`ChatComposer.vue` |
| 输入框「+」：居中弹出面板，书籍 / 论文两组四张来源卡 + 一个书名或论文名搜索框 | `ChatComposer.vue` |
| 搜索结果：弹窗单选列表（标题 + 作者·年份·页数 + 格式角标），下载按钮走邮箱与配额闸门；检索中 / 未接入 / 没查到 / 有结果四种状态各说各的，未接入时主按钮是「重试」且不会往对话里再写一遍查询 | `SearchResultsModal.vue`、`services/library-search.ts`、`stores/chat.ts` |
| 导入进度：弹窗（技能名 + 进度条 + 七个阶段圆点），完成后才在对话里落结果卡 | `IngestionProgressModal.vue`、`services/ingestion.ts` |
| 结果卡：封面 + 标题 + 作者/来源，tab **只按消息里真实存在的块出现**（概览要大纲、相似书籍要书目），一个块时不出 tab 条；相似书籍行是编号行 + 下载 / 已加入项目 | `MessageItem.vue`、`blocks/` |
| 学习计划按工作日 1h、周末 2h、英文 5 分钟/页、中文 3 分钟/页推算，页数与时长用行内步进器改，改完即重算（改动写回那条消息的 `assumptions`，切走再回来还是改过的值） | `services/study-plan.ts`、`blocks/StudyPlanCard.vue` |
| 上传 → 命名技能 → 进度弹窗 → 结果卡；下载 → 自动生成项目名 | `SkillNameDialog.vue`、`services/skill.ts` |
| z-Library 邮箱注册（责任告知 + 勾选确认）：邮箱是用户自己填的输入，落 `lexforge:library-email`，设置页那行能更换或解绑。**每邮箱能下几本由 z-Library 那边决定，前端不再自己计数** | `LibraryEmailDialog.vue`、`stores/account.ts` |
| `@技能` 提问：光标停在 `@词` 上就浮出技能列表（技能名与中英书名都能搜，上下键 / Enter / Tab 选），已 @ 中的显示成 chip，@ 到不存在的名字用警示 chip 说出来 | `ChatComposer.vue`、`stores/chat.ts` |
| 对话管理：有历史的对话有自己的地址 `/chat/:conversationId`（刷新、深链、前进后退都回得来），侧栏每行悬停三点菜单 重命名 / 删除，删掉当前条自动补一条空的；对话、项目、技能都落 `localStorage`，重启不丢 | `router/index.ts`、`SidePanel.vue`、`stores/chat.ts`、`stores/projects.ts` |
| 侧栏（US-004 / US-033）：离开对话视图且窗口够宽就自动展开、回到对话自动收起；侧栏里除了最近对话还有一列项目，项目名可以直接在这里重命名，也能进技能列或删除 | `App.vue`、`SidePanel.vue` |
| 项目：`+ 新建项目`、`N 个技能 · 更新于 2 小时前`、齿轮进子面板、三点菜单（重命名 / 编辑技能 / 删除，删项目连带删掉它的技能） | `ProjectsView.vue`、`services/time-ago.ts` |
| 书库：已导入的书籍与论文（封面 + 类型·页数·更新时间 + skill.md 路径 + 编辑 / 删除），顶栏有 全部 / 书籍 / 论文 分段与一个书名或技能名过滤框，筛完为空说的是「当前筛选条件下没有条目」 | `LibraryView.vue` |
| 设置：账号（只有用户名）、**邮箱单独一行**（没绑显示「未绑定」）、书库邮箱（已注册时显示地址 + 更换 / 解绑）、语言、主题、版本、模型，最后一行是**单独占一行的「退出登录」**；版本一行未登录不显示 | `SettingsView.vue` |
| 编辑技能子面板（返回 + 技能文件夹折叠 + skill.md + 单个技能删除）→ 主窗口编辑器（编辑 / 预览下划线 tab、脏标记、保存） | `SkillsPanel.vue`、`SkillEditor.vue` |
| 语音听写：点麦克风（或 `Ctrl+Shift+V`）→ 按钮变红色方块，说出的字实时进输入框，停止后仍可编辑再发；输入框下方提示行是固定文案，不随状态变 | `ChatComposer.vue`、`composables/use-dictation.ts`、`services/asr.ts` |
| 登录 / 注册：`.modal-mask` 半透明遮罩盖在当前页上的卡片（logo + 显示名 + 标语）、灰底带 + 斜角伪元素的文件夹页签切两种模式（照 `bwgzt/uweb/front-v3` 的 `login.vue`）、邮箱 + 密码（注册多一个确认密码）、行内校验与失败提示、叉号 / `Esc` / 点遮罩关闭；入口是侧栏底部的「立即登录」，退出登录清掉本地会话 | `LoginDialog.vue`、`services/auth.ts`、`stores/ui.ts`、`SidePanel.vue` |
| **没有前端自计的业务数**：额度、剩余本数、专业版状态这类只有后端能说的东西，接口不给就不累加（设置页的每日配额与 RAG 开关、本机切专业版的升级弹窗已删；侧栏那个角标保留位置，写死 `0/0`，等有用量接口再换成接口值） | `stores/account.ts` 只剩 `login` / `me` 回得来的字段 |
| 点关闭不退出进程：窗口隐藏进系统托盘，托盘左键双击（macOS 单击）唤回，右键菜单「显示主窗口 / 退出 LexForge」，菜单文案跟随界面语言 | `src/main/services/tray.ts`、`src/main/index.ts` |

## 前端接缝（接后端时替换）

| 接缝 | 现在 |
| --- | --- |
| 账号服务 | 四个端点全接真接口（`api/auth.ts` 只管线格式，会话归 `services/auth.ts` 的 `authAdapter`）：`POST /api/auth/login` `{ username, password }` → `{ token, username, plan }`；`POST /api/auth/register` `{ username, password, email?, lang }`（成功后立刻用同一套凭据走 login，注册响应本身不携带会话）；`GET /api/auth/me` → `{ id, username, email, plan, lang, created_at }`（`id` 现在是 Long 字符串，不再是 UUID）；`POST /api/auth/logout`。token 经 `services/token.ts` 存 `localStorage`（`lexforge:token`）并自动附到后续请求的 `Authorization: Bearer`。冷启动分两半：`restore()` 读本地 profile 保证首帧不闪未登录，挂载后 `verifySession()` 再打 `/api/auth/me` 刷新 plan / lang——**UUID 时代的旧 profile 行没有 `username`，直接被丢弃，旧 token 由 100004 清掉并弹登录框**。`me.lang` 只在用户从没点过中 / EN 时才采纳（点了就永远以本地选择为准） |
| HTTP 请求 | `utils/http.ts`：**骨架照 edataops-web-v3 `utils/request.ts`**，判定已换成后端的新契约——**HTTP 恒 200，业务成败只看 `code === 0`**，成功时把 `{ code, message, data }` 拆成 `data` 交给调用方（端点模块都按 `Api.*` 类型收），失败时抛 `ApiError { code, errorCode, messageKey, params, field, traceId }` 并把后端 `message` 原样 toast（后端已按 `Lang` 渲染好，前端不再抄一份文案）。每个请求自动带 `Lang: zh-CN|en-US`（取当前界面语言，实测后端会因此换 `message` 的语言）与 `Authorization: Bearer <lexforge:token>`——令牌由 `services/token.ts` 独存，请求拦截器统一附加，只有登录 / 注册标了 `isToken: false`（这个标记本身不会上线），所以后端除这两个端点外都要鉴权；`code === 100004` 清会话 + 弹登录框（`isRelogin` 防重入）；带 `silent: true` 的请求不 toast，由表单行内显示同一个 `message`，同一故障只说一遍；断网 / 超时 / 网关非 200 归一成 `HttpError { failure, status }`，文案在 `http.error.*`，由 `main.ts` 注册的回调渲染（传输层不留文案）。**改 `VITE_API_BASE` 的同时必须把新主机加进 `index.html` 的 CSP `connect-src`**；后端必须回 CORS 头（实测本机 8787 对 `http://localhost:5173` 有回），否则打包后（`file://` origin）读不到响应 |
| book-to-skill 导入 | **已接真接口**：`services/ingestion.ts` = `POST /api/books`（multipart，`.pdf .epub .docx .txt .md .markdown .html .htm .rtf .rst .adoc`、≤80MB）→ 每 1.5s 轮询 `GET /api/books/{id}` 到 `ready` / `failed` → `POST /api/skills/generate` → `GET /api/skills/{id}/content`。进度弹窗按 `queued / extracting / compiling / generating / attaching` 五个点走，并把后端 `detail` 那句中文原样显示；不设超时（慢不等于失败），`failed` 时把 `book.error` 落进对话 |
| 技能去重 | `POST /api/skills/generate` 撞 `300003` 时弹 `SkillConflictDialog.vue`：「直接使用」用 `GET /api/skills?book_id=` 找回的 active 版本，「重新生成」走 `POST /api/skills/{id}/regenerate`（旧版本转 `superseded`，后端自动记一次 `thumb_down`）。关掉弹窗等于「直接使用」，不毁东西 |
| 相似书目 / 搜索结果 | 本地书目数据已删：`api/library.ts` 的 `searchEntries(query, kind)` 是唯一接缝，占位实现抛 `LibrarySearchNotConfiguredError`，弹窗显示「暂时检索不到结果，请稍后重试」并给重试（**这句是给用户看的说法，接口名之类的内部话术一律不进界面**）；接口给什么条目就渲染什么。**下载端点后端还没有**，所以 `downloadEntry` 只落一条「这本书暂时下载不了」的提示 |
| project-name-skill | `services/skill.ts` 的 `proposeProjectName`（本地命名，后端不参与） |
| 学习大纲内容 | **已接**：`GET /api/books/{bookId}/outline` 的章节列表转成 `outline` 块，结果卡的「概览」tab 从此有真数据；拿不到或为空就干脆不出这个 tab |
| 问答回答 | **已接 §4**：`@技能` → 找到该技能的 `bookId` → `POST /api/study` `{ book_id, action: 'distill', ui_lang }` → 回答作为 `markdown` 块渲染（`ui/MarkdownView.vue`），前面一句「下面是这本书的要点提炼」。`focus` / `instruction` **不发**（实测非空一律回 `500001`），但这件事**不写进界面文案**，失败也只说「这本书暂时问不了，请稍后再试一次」，引擎原话进 `console.error`。US-015 的付费墙**不在提问路径上** |
| 语音转文字 | `services/asr.ts` 的 `asrAdapter`：给它一个 `MediaStream`，它回 `Asr.Segment { text, final }`（形状在 `services/types.ts`），占位实现抛 `AsrNotConfiguredError`。`createTranscript()` 已把中间/最终结果拼进输入框，接口一通就出字；未接入时麦克风照常开、计时照常走，只把提示行换成灰字说明 |
| 技能内容持久化 | 打开编辑器走 `GET /api/skills/{skillId}/content`，保存走 `PUT /api/books/{bookId}/skill`（§3.7：整篇覆盖、**不会重切章节**，这是后端已知行为）；本机 `localStorage` 只作为镜像与离线副本。给用户的提示只有三种：「已保存」/「已保存到本地」/「保存失败，改动已留在本地」——服务器、副本这些词不进界面。真文件落盘仍需主进程 `fs` |
| 额度与付费 | **前端不做任何计数**：每日成果数、每邮箱剩余本数、专业版开关都删了，因为后端没有对应端点，客户端自己累加出来的数字只会骗人。要显示这些得先有 `GET` 得到的用量字段 |
| 项目 / 技能 / 书库列表 | 删除项目会尽力通知 `DELETE /api/books/{bookId}`（本地先删、服务端失败不复活；示例书 `primer` 后端会拒）；列表本身仍来自本机 `localStorage`，`GET /api/books` 还没接进书库页 |
| 技能导出 | **已接**：编辑器右上角「导出 PDF」/「导出 Word」→ `GET /api/skills/{skillId}/export?format=pdf|docx`，`data.base64` 交给 `utils/download.ts` 的 `downloadBase64` 走浏览器下载，文件名与 `content_type` 都用后端给的那份；只有带服务端 `skillId` 的技能才出这两个按钮 |

## 未做

- 语音转文字：听写链路（开麦、计时、上屏合并、快捷键）已做完，缺识别引擎——Electron 的 Chromium 不带 `SpeechRecognition`，需要一个 ASR 接口（WebSocket 分片或上传均可），接进 `services/asr.ts` 的 `asrAdapter` 即可。
- 真实下载（z-Library / Google Scholar）、RAG 检索、云端账号偏好同步：后端 §0 明确写了尚未实现，前端不据此编数据。
- 结果卡的「相似书籍」tab：卡的结构与下载路径都在，缺的只是书目推荐这个端点。「概览」已经接上 `GET /api/books/{id}/outline`，问答也接上了 `POST /api/study`。
- 书库页现在读的是本机镜像，`GET /api/books`（服务端书架列表）还没接进来。
- §5 还剩两个端点没接 UI：`GET /api/skills/{id}/chapters` 与单章正文（章节目录树）、`POST /api/skills/{id}/feedback`（点赞点踩）。
- 技能导出（`GET /api/skills/{id}/export?format=pdf|docx`，返回 `data.file_name` / `content_type` / `base64`）**已接**，按钮在编辑器右上角。实测 `format=pptx` 后端不报错、直接把同一份 PDF 回给你，所以没有 `slides` 这个真格式，不做第三个按钮。
- 登录锁定（100007 倒计时）、注册字段校验、`me.lang` 兜底都已按文档实现。
- 除上面这些外，剩下的缺口都需要后端或主进程能力，按「只写前端页面」的要求留空。

## 目录

```
src/
├─ main/       主进程：窗口、IPC、按系统语言取默认语言
├─ preload/    contextBridge 暴露的最小 API（sandbox + contextIsolation）
├─ shared/     主进程 / 预加载 / 渲染进程共用的类型与通道名
└─ renderer/   Vue 3 渲染进程
   ├─ assets/       main.css（设计变量与基础样式）、ui.css（手写控件）
   ├─ router/       vue-router 路由表（hash 模式，全部懒加载）
   ├─ views/        路由对应的整屏页面（ChatPanel / LibraryView / ProjectsView / SkillEditor / SettingsView）
   ├─ components/   面板、顶栏、输入框、卡片（blocks/）、弹窗（dialogs/）、ui/（图标、弹窗、Toast）
   ├─ composables/  use-toast、use-menu、use-localized、use-dictation
   ├─ stores/       ui / language / account / projects / chat
   ├─ services/     登录会话接缝、token 存储、学习计划推算、导入进度、skill.md 生成、ASR 接缝
   └─ i18n/         zh-cn 与 en-us 全量文案
resources/icon.png   打包与运行时图标（1024×1024，标题栏 / 任务栏 / dock / .ico / .icns 同源）
src/renderer/public/logo.svg  浏览器标签页图标（标志居中到 640×640）
scripts/ensure-electron.mjs  npm 11 不再转发 .npmrc 自定义键，这里自己把镜像传给 Electron 安装脚本
```

`.npmrc` 里的 `electron_mirror` 在 npm 11 下会打印 `Unknown project config` 警告，属正常现象，镜像仍由上面的脚本读取生效。
