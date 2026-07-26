# 易赛通主题规范（Apple Design 向）

## 原则

1. **蓝白基调保留**：浅色以白底 + 淡蓝灰背景为主，品牌蓝 `#526fd7` 用于主按钮、链接、选中态。色板未随改版变动。
2. **发丝边框 + 极淡阴影并存**：卡片用 `--shadow-1` 起一层极轻的高度感，边框降到 `--color-hairline`。不要回到「零阴影」。
3. **双主题同源**：颜色只走 `design-tokens.css` 变量；业务页禁止写死 `slate` / `white` / 硬编码 hex。
4. **层级要有对比**：字号、字重、圆角都分档，禁止再用 `!important` 把它们压平。
5. **AI 与主应用同主题**：暗色下助手不强制白底；暗色为深蓝底 + 冰蓝高亮。
6. **不做**：纯黑 ChatGPT CTA、去掉蓝色品牌、冰蓝渐变按钮、卡片 hover 上浮。

## 字重（重要）

macOS 走 SF 可变字体，`590` 即 Semibold。但 **Windows 中文回落到 Microsoft YaHei，只有 400 / 700 两档**，按 CSS 字重匹配规则 **任何 >500 的值都会被取整到 700**。

| 意图 | 写法 | macOS | Windows |
|------|------|-------|---------|
| 正文 | `400` | Regular | Regular |
| 中等 | `500` | Medium | Regular ✅ |
| 半粗 / 标题 | `590` | Semibold | Bold |
| ~~`510`~~ | 禁用 | Medium | **Bold ❌** |

结论：「中等」一律写 `500`，写 `510` 会让 Windows 上整片文字变粗。

## 字阶

业务页**一律用语义类**，不要再写 `text-[13px]` 这类任意值（唯一例外：`material-symbols-outlined` 上的 `text-[Npx]` 是图标尺寸，保持原样）。

| Token | 尺寸 | 用途 |
|-------|------|------|
| `text-caption-2` | 11px | 眉标、角标 |
| `text-caption` | 12px | 辅助说明、时间戳 |
| `text-footnote` | 13px | 次级标签、列表副文本 |
| `text-subhead` | 15px | 正文（body 基准） |
| `text-callout` | 16px | 强调正文 |
| `text-title-3` | 18px | 区块标题 |
| `text-title-2` | 22px | 页面副标题 |
| `text-title-1` | 28px | 页面标题 |
| `text-hero` | 34px | 营销大标题 |

⚠️ **不能定义 `--text-body`** —— 已有 `--color-body`，两者都生成 `.text-body`，颜色会赢，字号 token 变成死代码。15px 用 `text-subhead`。

字阶类自带 `line-height`，需要覆盖时加 `leading-*`（优先级更高）。

## 圆角与高度

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-md` | 12px | 按钮、输入框 |
| `--radius-lg` | 16px | 卡片、面板 |
| `--radius-xl` | 20px | 浮层、模态、大卡片 |
| `--radius-pill` | 9999 | chip / badge |
| `--shadow-1` | — | 卡片静息 |
| `--shadow-2` | — | 卡片 hover、按钮 hover |
| `--shadow-3` | — | 下拉、菜单、气泡 |
| `--shadow-4` | — | 模态、抽屉 |

## 材质（毛玻璃）

`.material-thin` / `.material-regular` / `.material-thick`，或直接用 `--material-*-bg` + `--material-*-filter`。
已应用于：顶栏、侧栏、Header 三个浮层、ConfirmModal、`.glass*`。

## Token 语义

| 语义类 / token | 用途 |
|----------------|------|
| `bg-canvas-parchment` / page | 页面底 |
| `bg-canvas` / surface | 卡片、面板、顶栏 |
| `bg-surface-tile-1` | 次级底、hover、输入填充 |
| `text-ink` | 主文字 |
| `text-body-muted` / `text-body-subtle` / `text-placeholder` | 次级文字 |
| `border-hairline` / `border-border` | 分割与卡片边框 |
| `text-primary` / `bg-primary` | 链接与主按钮 |
| `app-panel` | 标准卡片容器（首选） |
| `btn-primary` / `btn-secondary` / `btn-utility` | 按钮（高 40，按压缩放 0.97） |
| `input-glass` | 表单控件（填充式 + focus 环） |
| `segmented` / `segmented-item` | 分段控件 |

## Do / Don't

- Do：`className="app-panel p-5"` 做卡片
- Do：`text-body-muted` 做辅助说明
- Do：需要中等字重时写 `font-medium`（500）
- Don't：`bg-white border border-slate-200`
- Don't：暗色蓝渐变按钮、卡片蓝光 hover、hover 时 `translateY`
- Don't：在页面写 `#xxx` 硬编码色
- Don't：用 `!important` 覆盖字号 / 字重 / 圆角

## 主题切换

- 存储：`localStorage.theme` = `light` | `dark` | `system`
- 应用：`<html class="dark">`（system 时按 `prefers-color-scheme`）
- 首屏：`index.html` 内联脚本防 FOUC
