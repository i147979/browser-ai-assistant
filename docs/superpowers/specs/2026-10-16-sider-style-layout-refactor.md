# Sider 风格侧边栏布局改造方案

日期：2026-10-16
原型：`../prototype/baa-layout-proto.html`（工作区 `ai_plugin/prototype/`，可拖宽联调）
范围：仅 `src/side-panel/` UI 层，不改业务逻辑与数据模型（除一处可选扩展）。

## 1. 目标与原则

1. 扁平化：去掉标题行与卡片套卡片，宽度尽量留给内容。
2. 图标化 + tooltip：所有纯文字按钮换图标按钮，悬浮显示文字说明；保留原有 aria-label/title 无障碍语义。
3. 对话区零按钮：消息区只读，所有操作收敛到顶栏和 Composer 两个区域。
4. Composer 三层结构：工具栏行（输入框上方）→ 输入框（附件/上下文芯片/textarea）→ 输入框内部底行（BAA 独有开关 + Token 环 + 圆形发送）。
5. 响应式以容器查询渐进收起为主，不再依赖 720px 断点做结构性切换。
6. 已验证的 CSS 修复一并落地：`scrollbar-gutter: stable`、取消两端对齐、`overflow-wrap: anywhere` 收敛到代码/URL 场景、气泡 `max-width: min(640px, 85%)`。

## 2. 目标布局结构

```
┌────────────────────────────────────────────┐
│ topbar: [会话列表开关] [会话名…] [隐私][导出][插件设置] │  ← App.tsx
├────────────────────────────────────────────┤
│ messages（居中列 max-w 680，无按钮）                    │
│   用户消息：右对齐气泡 + 悬浮 编辑/复制/重发              │
│   AI 消息：模型名 → 思考折叠 → 工具折叠 → 正文          │
│            → 悬浮 复制/重新生成/导出图片                │
├────────────────────────────────────────────┤
│ composer-toolbar: [模型 pill] | [新建][历史][截图]      │  ← ChatComposer.tsx
│                   [上传][刷新][聊天设置]               │
│ ┌ input-box ─────────────────────────────┐ │
│ │ 附件缩略图条 / 上下文芯片                      │ │
│ │ textarea                              │ │
│ │ [模式盾][工具扳手][拼接][提取][标签页] ○token [发送] │ │
│ └───────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

## 3. 分阶段实施

### 阶段 0：CSS 质量基线（无 JSX 改动，可独立发版）

全部在 `src/side-panel/styles.css`：

1. `.app-shell` 或根容器加 `scrollbar-gutter: stable;`。
2. 删除 `.message-bubble p, .message-bubble li` 的 `text-align: justify; text-align-last: left;`（约 1036 行）。
3. `.message-bubble-wrap`（约 877 行）的 `overflow-wrap: anywhere` 移除，改到 `.message-bubble code`、`.markdown-code-block`、`dd`、长 URL 容器上；正文改用现有 `break-words`。
4. `.message-bubble-wrap` 的 `max-width: 80%` 改为 `max-width: min(640px, 85%)`。
5. `.chat-main-layout` 删除 `transition: grid-template-columns 220ms ease` 对断点跨越的无效过渡（保留给手动开合）。

验收：拖动面板宽度 320→800px，无滚动条抖动、无整行重排跳变。

### 阶段 1：顶栏重构（App.tsx）

现状：`app-header`（App.tsx:73 起）= 大标题 + [新建对话][浏览器控制][设置]。

改动：

1. 删除 `app-title` 大标题；`app-header` 改名 `topbar`，结构改为：
   `[会话列表开关] [活动会话名 truncate] [隐私] [导出] [插件设置]`，右起三个为图标按钮。
2. `showSettings` 状态从 App.tsx 本地 state 迁入 `appStore`（新增 `settingsOpen / toggleSettings`），供顶栏齿轮触发 `SettingsPanel`。
3. 「新建对话」按钮从顶栏移除，逻辑（`createChatSession({ preserveSelectedModel: composerHasDraft })`）随按钮迁入 ChatComposer 工具栏。
4. 「浏览器控制」全局开关从顶栏移除，并入 Composer 模式菜单（见阶段 2）：菜单顶部加一行总开关，状态读写现有 `browserControlEnabled / setBrowserControlEnabled`。
5. `UpdateAvailableButton` 保留在顶栏（放会话名左侧或右侧，视觉为小圆点/图标）。
6. `historyPanelOpen` 开关按钮固定显示在顶栏最左（原 `chat-history-panel-toggle` 从 ChatPanel 移除，七条杠图标）；`@media (min-width: 720px)` 里对它的 display 切换（styles.css:769）删除。

### 阶段 2：Composer 重构（ChatComposer.tsx + styles.css）

现状渲染序（ChatComposer.tsx:588 起）：follow-up 队列 → 附件条 → `context-strip`（选择标签页/芯片/刷新/截图 四个文字按钮）→ `chat-input-shell` → `composer-actions`（开关行 + 发送行）。

目标序：

1. follow-up 队列、附件条保持不变（附件条移入 input-box 内部顶部，样式微调）。
2. 新增 `composer-toolbar` 行，成员（全部图标按钮，data-tip 提示）：
   - `ModelSelector` 改 pill 样式：模型名 truncate + 参数徽标 + chevron，flex:1 min-w-0；
   - [新建会话]：来自 App 的迁移逻辑；
   - [历史]：触发现有 `SessionHistoryDialog`（原 `chat-history-trigger`）；
   - [截图]：原 context-strip 的 `handleCaptureVisibleTab`；
   - [上传图片]：原 input-shell 的 hidden file input + label；
   - [刷新上下文]：原 `refreshPageContext`；
   - [聊天设置]：触发 `ChatPreferenceDrawer`（原 `chat-drawer-trigger`）。
3. `context-strip` 拆解：`context-chip`（已匹配规则）保留并移入 input-box 内部顶部；「选择标签页」变为 input-bottom 图标；「刷新」「截图」上移到工具栏；整行删除。
4. `composer-actions` 两行合并为 input-box 内部 `input-bottom` 一行，左组图标依次：
   - [自动化模式]：现有 `composer-mode-trigger` 换盾牌图标，点击弹现有 `composer-mode-menu`（普通/受控增强/完全访问），菜单顶部新增浏览器控制总开关行（阶段 1 第 4 条）；
   - [工具调用]：现有 `composer-switch`（扳手）+ `composer-tool-menu`，样式改深底浮窗（对齐原型），保留 启用/启用全部/关闭 与分组列表；
   - [拼接上下文] [提取模式]：现有 `ComposerSwitch`，仅换容器与 active 圆点样式；
   - [选择标签页]：现有 `contextDialogOpen` 逻辑换图标。
   右组：`TokenUsageMeter`（组件不动，改尺寸 22px 环）+ 圆形发送按钮（`sending` 态显示方块停止图标，逻辑不变）。
5. 删除类：`context-strip`、`composer-actions`、`composer-switches`、`composer-submit-group` 的旧布局样式；新增类：`composer-toolbar`、`input-box`、`input-bottom`、`ctx-chip-row`、`send-circle`、`tools-menu-*`。

### 阶段 3：消息区改造（MessageList.tsx + styles.css）

1. 删除 `.message-avatar` 及 JSX 引用。
2. AI 消息新增 `ai-header`：显示消息模型名（`message.modelId` → models store 查显示名，查不到回退 modelId）。
3. 工具调用块包进 `<details class="ai-sec">`：summary「调用工具 · N」，内容复用现有 `message-tool-call-list` / popover 逻辑。
4. 思考折叠区：仅当消息含推理内容时渲染。当前 `ChatMessage` 无独立 reasoning 字段——本期可先不展示（默认没有思考数据），预留 `reasoning` 可选字段作为后续数据层扩展，不在本方案强制。
5. 悬浮操作条：现有复制/重新生成/导出图片逻辑全保留（MessageList.tsx:296-365），样式向原型靠拢：
   - 操作按钮统一 26px `act-btn`，`opacity: 0` + 容器 hover/focus-within 显示；
   - 用户消息操作行右对齐，增加「编辑」（复用现有 `editAndRegenerateUserMessage` 的编辑面板入口）与「重发」（可直接复用 regenerate 逻辑，确认弹窗保留）。
6. 删除气泡内 `text-align: justify`（阶段 0 已做，这里清 JSX 无关项）。

### 阶段 4：tooltip 系统 + 渐进收起

1. 新建 `src/side-panel/components/Tip.tsx`（或纯 CSS 方案）：CSS 伪元素 tooltip，深底 12px 圆角 6px；
   悬停 350ms 延迟显示、移开 100ms 快速消失（延迟只挂在 :hover 态）。
2. 边缘防截断：`useTipEdge` hook（ResizeObserver + mouseover 时计算按钮中心到面板边缘 <72px 则加 `.tip-edge-start/.tip-edge-end`），顶栏首尾按钮、input-bottom 首尾图标必须覆盖。
3. 全部 `title` 属性迁移为 data-tip（保留 aria-label）；富浮窗（TokenUsageMeter 表格、tool menu）不使用 data-tip。
4. 容器查询渐进收起：`.app-shell { container-type: inline-size }`，断点与原型一致：
   - <460px 藏「刷新上下文」；<420px 藏「拼接/提取」（状态并入扳手圆点提示）；<390px 顶栏藏「隐私/导出」；<360px 藏「截图/上传」。
   - 删除 styles.css:284/314/769 的 720px 结构断点；会话列表改为纯手动开关 + `grid-template-columns 0↔264px` 过渡（原 transition 保留生效）。

### 阶段 5：清理与验收

1. 删除死代码：`app-title`、`chat-history-trigger`、`chat-drawer-trigger` 旧样式、`text-align: justify` 残留。
2. 跑 `npm run check`（typecheck + build + vitest + 打包检查）；`tests/` 与 `test:e2e` 中引用旧选择器（`.app-title`、`chat-history-trigger` 等文本）的用例同步更新。
3. 手动验收清单见第 7 节。

## 4. 逐文件改动清单

| 文件 | 改动 |
|---|---|
| `src/side-panel/App.tsx` | 删标题；topbar 重排；新建对话/浏览器控制迁出；settingsOpen 入 store |
| `src/side-panel/state/appStore.ts` | 新增 `settingsOpen / setSettingsOpen`（UI 切片） |
| `src/side-panel/components/ChatPanel.tsx` | 删 chat-model-row 旧按钮组；chat-history-panel-toggle 迁出 |
| `src/side-panel/components/ChatComposer.tsx` | 工具栏行 + input-bottom 重排；截图/上传/刷新/选择标签页/模式/工具/开关归位 |
| `src/side-panel/components/ModelSelector.tsx` | pill 化样式（逻辑不动） |
| `src/side-panel/components/MessageList.tsx` | 删头像；AI 消息模型名 + 工具折叠；操作条样式类 |
| `src/side-panel/components/Tip.tsx`（新增） | data-tip + 边缘检测 hook |
| `src/side-panel/styles.css` | 阶段 0/2/3/4 全部样式；新增约 300 行、删除约 150 行 |
| `public/manifest.json` | 不动 |

## 5. 风险与回归点

1. `showSettings` 入 store：SettingsPanel 与 ChatPanel 互斥渲染逻辑不变，仅状态来源变化；注意 `Escape` 关闭等既有交互。
2. 浏览器控制总开关并入模式菜单后，原顶栏开关的长文案说明移入菜单内说明行，避免丢失风险提示语义。
3. e2e/单测里 `getByText("历史")`、"导出" 等文字按钮定位会失效，需改为 aria-label 定位。
4. 容器查询需要 Chrome/Edge ≥ 105，目标环境（Edge 扩展）满足；`@container` 不能作用在 `height: 100vh` 的 html 上，挂在 `.app-shell`。
5. 阶段 0 可独立合入先行验证手感，降低大改 PR 的回归面。

## 6. 建议合并顺序

`阶段 0`（单独 PR）→ `阶段 1 + 阶段 4.4`（顶栏与断点解耦）→ `阶段 2`（Composer，最大改动）→ `阶段 3`（消息区）→ `阶段 4.1-4.3 + 阶段 5`（tooltip 与清理）。

## 7. 验收清单

- [ ] 拖宽 320→860px：无滚动条抖动、无结构性跳变、图标按 460/420/390/360 逐级收起
- [ ] 顶栏与工具栏所有图标 hover 有 tooltip，首尾按钮无左右截断，移开 100ms 内消失
- [ ] 对话区内无任何常驻按钮
- [ ] AI 消息：模型名 + 工具折叠 + 悬浮 复制/重新生成/导出图片；用户消息悬浮 编辑/复制/重发
- [ ] Token 环悬浮显示完整用量表格；扳手菜单含 启用/启用全部/关闭 + 分组工具列表 + 总开关
- [ ] 隐私模式、导出菜单、聊天设置抽屉、标签页选择弹窗功能不回归
- [ ] `npm run check` 全绿
