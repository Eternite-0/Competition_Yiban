# 易赛通主题规范（ChatGPT / Codex 向）

## 原则

1. **蓝白基调保留**：浅色以白底 + 淡蓝灰背景为主，品牌蓝 `#2563eb` 用于主按钮、链接、选中态。
2. **边框 > 阴影**：卡片几乎无投影；结构清晰优先于装饰。
3. **双主题同源**：颜色只走 `design-tokens.css` 变量；业务页禁止写死 `slate` / `white` / 硬编码 hex。
4. **壳层克制**：侧栏 + 顶栏薄；字阶仅 标题 / 正文 / 辅助 三级。
5. **AI 与主应用同主题**：暗色下助手不强制白底；暗色为深蓝底 + 冰蓝高亮。
6. **不做**：纯黑 ChatGPT CTA、去掉蓝色品牌、冰蓝渐变按钮。

## Token 语义

| 语义类 / token | 用途 |
|----------------|------|
| `bg-canvas-parchment` / page | 页面底 |
| `bg-canvas` / surface | 卡片、面板、顶栏 |
| `bg-surface-tile-1` | 次级底、hover、输入浅底 |
| `text-ink` | 主文字 |
| `text-body-muted` / `text-body-subtle` / `text-placeholder` | 次级文字 |
| `border-hairline` / `border-border` | 分割与卡片边框 |
| `text-primary` / `bg-primary` | 链接与主按钮 |
| `app-panel` | 标准卡片容器（首选） |
| `btn-primary` / `btn-secondary` / `btn-utility` | 按钮 |
| `input-glass` | 表单控件 |

## Do / Don't

- Do：`className="app-panel p-5"` 做卡片
- Do：`text-body-muted` 做辅助说明
- Don't：`bg-white border border-slate-200`
- Don't：暗色蓝渐变按钮、卡片蓝光 hover
- Don't：在页面写 `#xxx` 硬编码色

## 主题切换

- 存储：`localStorage.theme` = `light` | `dark` | `system`
- 应用：`<html class="dark">`（system 时按 `prefers-color-scheme`）
- 首屏：`index.html` 内联脚本防 FOUC
