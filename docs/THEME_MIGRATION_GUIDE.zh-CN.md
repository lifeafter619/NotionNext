# 主题迁移指南（NotionNext）

[English](./THEME_MIGRATION_GUIDE.md)

本指南用于把外部主题（例如 Astro/Vite 主题）迁移到 NotionNext 的 Next.js + Notion 数据架构中。

## 1）迁移目标

- 尽量保留原主题的视觉语言（布局、间距、卡片、动效）。
- 遵循 NotionNext 的数据流与功能约定。
- 通过 `themes/<theme>/config.js` 暴露开关，避免把行为硬编码在页面里。

## 2）推荐目录结构

为新主题建立独立目录：

- `themes/<theme>/index.js`
- `themes/<theme>/style.js`
- `themes/<theme>/config.js`
- `themes/<theme>/components/*`

原则：

- 不要直接引用其它主题目录下的 UI 组件。
- 跨主题通用能力优先复用全局组件（如 `NotionPage`、`Comment`、`ShareBar`、`FlipCard`、广告组件等）。
- 主题专属渲染与样式必须留在当前主题目录中。

## 3）NotionNext 数据契约

主题布局/组件常见可用 props：

- `siteInfo`：站点元信息（标题、描述、封面等）
- `posts`、`post`、`archivePosts`
- `latestPosts`、`categoryOptions`、`tagOptions`
- `notice`
- `postCount`
- `prev`、`next`
- `customNav`、`customMenu`
- `rightAreaSlot`

文章常用字段：

- `title`、`slug`、`href`、`summary`
- `publishDay`、`lastEditedDay`
- `pageCover`、`pageCoverThumbnail`
- `category`、`tagItems`
- `toc`

## 4）必须兼容的 NotionNext 功能

迁移新主题时，至少覆盖：

1. **数据驱动菜单**
   - 支持默认菜单项
   - 支持 `customNav`
   - 支持 `CUSTOM_MENU + customMenu` 覆盖

2. **公告模块**
   - 使用 `NotionPage` 渲染公告内容
   - 可通过主题配置开关启停

3. **Notion 封面作为 Hero**
   - 首页 Hero 优先使用 `siteInfo.pageCover`
   - 支持 fallback 配置图

4. **深色模式**
   - 使用全局 context（`useGlobal` / `toggleDarkMode`）
   - 不要单独实现与全局割裂的暗色状态

5. **文章功能模块**
   - TOC 开关
   - 分享开关
   - 评论开关
   - 版权信息开关
   - 上一篇/下一篇开关

6. **侧栏模块化**
   - 最新文章、分类、标签
   - 联系卡（可选翻转）
   - 统计卡
   - 广告卡
   - 插件插槽（`rightAreaSlot`）

7. **右下角浮动工具**
   - 回到顶部
   - 跳到评论区
   - 深色模式快捷切换

## 5）配置设计建议

统一使用 `siteConfig('<KEY>', <default>, CONFIG)`。

建议按组命名：

- `THEME_MENU_*`
- `THEME_HERO_*`
- `THEME_POST_LIST_*`
- `THEME_WIDGET_*`
- `THEME_ARTICLE_*`

避免在组件内部散落“魔法常量”。

## 6）推荐迁移流程

1. 先做最小可运行骨架（`LayoutBase`、`LayoutIndex`、`LayoutSlug` 等）。
2. 再把大文件 `index.js` 拆分为多个组件。
3. 按原主题逐项还原视觉细节（卡片、Banner、元信息密度、动效）。
4. 接入 NotionNext 的特色模块与配置开关。
5. 为新增配置补齐文档。
6. 执行 lint 并验证关键路由：
   - 首页/列表/搜索/归档/分类/标签/文章/404
   - 深浅色模式
   - 菜单行为（`customNav`、`CUSTOM_MENU`）
   - 公告、广告、插件槽、联系卡

## 7）联系邮箱（CONTACT_EMAIL）约定

环境变量 `NEXT_PUBLIC_CONTACT_EMAIL` 会在构建阶段写入 `conf/contact.config.js`，并以 Base64 形式保存在 `siteConfig('CONTACT_EMAIL')` 中，用于避免在静态页面里直接暴露明文邮箱。迁移或新增主题时请务必按用途选用下列方式，否则会出现「mailto 乱码」或 Gravatar 不匹配等问题。

| 场景 | 正确做法 | 错误示例 |
| --- | --- | --- |
| 图标/链接点击打开系统邮件客户端 | 使用 `handleEmailClick`（见下） | `href={\`mailto:${siteConfig('CONTACT_EMAIL')}\`}` |
| 页脚、文案中展示邮箱地址 | `resolveContactEmail(siteConfig('CONTACT_EMAIL'))` | 直接渲染 `siteConfig('CONTACT_EMAIL')` |
| Gravatar 等需要邮箱 md5 | 对 `resolveContactEmail` 的结果取小写再哈希 | 对密文做 `md5` |
| `security.txt` 等服务端生成的联系行 | `resolveContactEmail` 后再写入 | 把密文写进 `mailto:` |

**点击发邮（推荐与 `themes/next/components/SocialButton.js` 保持一致）：**

```javascript
import { useRef } from 'react'
import { handleEmailClick } from '@/lib/plugins/mailEncrypt'
import { siteConfig } from '@/lib/config'

const emailIcon = useRef(null)
const CONTACT_EMAIL = siteConfig('CONTACT_EMAIL')

// ...
{CONTACT_EMAIL && (
  <a
    onClick={e => handleEmailClick(e, emailIcon, CONTACT_EMAIL)}
    title='email'
    className='cursor-pointer'
    ref={emailIcon}>
    {/* icon */}
  </a>
)}
```

实现位于 `lib/plugins/mailEncrypt.js`：`handleEmailClick`、`decryptEmail`、`resolveContactEmail`。

## 8）向主仓库贡献主题：预览图与简介（主题切换面板）

你在本地或自建 fork 中，可随时将自定义主题放在 **`themes/<主题目录名>/`** 下使用，**不强制**提交到 NotionNext 上游。

若希望主题被 **合并进 NotionNext 官方主仓库**，除完整主题代码外，还需补齐「主题切换」浮窗中的 **预览图** 与 **文案介绍**（站点启用 `THEME_SWITCH` / `NEXT_PUBLIC_THEME_SWITCH` 时展示）。

### 8.1 预览图目录与命名（固定）

将预览静态资源提交到仓库目录：

**`public/images/themes-preview/`**

| 文件 | 说明 |
| --- | --- |
| `<主题目录名>.png` | 常规约定下需提供的基准图；与 `themes/` 下文件夹名一致、小写，例如 `endspace.png`。用作 `LazyImage` 的 **`fallbackSrc`**，保证兼容性。 |
| `<主题目录名>.webp` | 强烈建议同时提供；由 PNG 导出或转换即可。用作优先 **`src`**，体积更小、加载更快。可用 `cwebp`、Squoosh、ImageMagick 等将 PNG 转为 WebP。 |

组件默认按 **`/images/themes-preview/<id>.webp`** 与 **`.png`** 读取；若某一格式缺失，面板仍能工作，但请在 PR 中尽量两者齐备。

### 8.2 展示名与简介（固定配置文件）

编辑 **`conf/themeSwitch.manifest.js`**，在 **`THEME_SWITCH_MANIFEST`** 中为主题 id（**等于** `themes/` 下目录名）增加一条配置：

- **`name`**（可选）：主题切换面板里显示的标题；不写则自动把目录名格式化为可读标题。
- **`summary`**（推荐）：一句话简介，显示在卡片标题下方。
- **`cover`** / **`coverWebp`**（可选）：自定义预览图 URL；不写则使用上一节的默认路径。若暂时只提供 PNG、不上传 webp，可将该主题的 **`coverWebp`** 设为 **`''`**，面板将仅使用 PNG。
- **`tier`**（可选）：`'free'` 或 `'paid'`；缺省为 **`'free'`**，面板会显示对应标签（免费 / 付费）。后续若上线付费主题，将 **`tier`** 设为 **`'paid'`** 即可区分展示。

读取逻辑由 **`getThemeSwitchMeta()`**（与文件同目录导出）统一合并默认值；**`components/ThemeSwitch.js`** 只依赖该函数，主题目录内无需重复维护简介。

### 8.3 文档与其他约定

- 主题详细说明仍建议写在 **`docs/themes/`**（见下文「高还原度检查清单」中的文档放置约定）。
- 合并主仓库前请在 PR 说明中列出：预览图文件、`themeSwitch.manifest.js` 中新增或修改的条目。

### 8.4 面向开发者：开源贡献与商业化规划（路线说明）

本节面向**主题开发者**，说明当前开源协作方式与**后续可能**的商业化方向；具体规则与时间表以项目正式公告为准。

- **承认投入**：完整主题涉及视觉、交互、多端适配与长期兼容，开发与维护成本高；向 NotionNext **公开主仓库**贡献可再分发主题，是对社区的重要支持。
- **当前默认路径**：继续鼓励通过 **GitHub 主仓库 PR** 提交**免费使用**的主题（并遵守 §8.1–§8.3 的预览与 manifest 约定）。本地或私有 fork 自用不受限。
- **后续规划（尚未落地）**：在生态成熟后，**拟允许开发者将部分主题以付费形式提交**，在尊重作者劳动的前提下，为高质量主题提供可持续路径。
- **规划中的形态（示意）**：后续可能建立**独立私有 Git 仓库**，供开发者**上传、版本化与提交主题**；主题可**自主或平台协助定价**，用户在**付费后**获得**在自有环境私有化部署该主题**所需的交付物或授权（具体许可范围、更新策略与技术支持以正式发布为准）。
- **与代码的衔接**：`conf/themeSwitch.manifest.js` 中的 **`tier`**（`free` / `paid`）用于主题切换面板的展示分层；**付费鉴权、订单、交付与私有化部署流程不会仅靠 manifest 完成**，上线时将另有专用文档与工具链。

## 9）Fuwari 迁移说明

`themes/fuwari` 目前已落地：

- 上游样式参考源：[saicaca/fuwari](https://github.com/saicaca/fuwari)
- Notion 封面 Hero 支持
- 数据驱动菜单（支持 `customNav` / `customMenu`）
- 独立 TOC、侧栏模块、右下角浮动区
- 基于全局 `FlipCard` 的翻转联系卡

## 10）常见坑位

- 菜单硬编码，没有接 `customMenu`。
- 直接复用其他主题 UI，导致耦合。
- 深色模式与全局状态不一致。
- 缺少 `post?.toc`、`notice?.blockMap` 等空值保护。
- 新增功能未透出配置开关。
- 联系邮箱使用 `mailto:` 直链密文或未使用 `handleEmailClick` / `resolveContactEmail`（参见上文第 7 节）。

## 11）高还原度检查清单（以 Fuwari 为例）

- **布局方向**：桌面端默认应为“左侧功能区 + 右侧内容流”。
- **Hero 全宽**：避免 `calc(50% - 50vw)` 在滚动条场景导致偏移，优先使用居中平移方案。
- **文章卡双形态**：
  - 有封面：左文右图
  - 无封面：保留右侧按钮导轨，保持节奏统一
- **Readmore 对齐**：右侧按钮区域需和卡片高度对齐，不应出现跳变。
- **侧栏个人卡**：若原主题有社交按钮行，应在头像/简介下补齐。
- **主题色调色板体验**：
  - 从顶部右上角调色按钮触发
  - 使用悬浮面板，不放在侧栏
  - 实时预览 + 本地记忆
  - 显示可复制的 hue/hex，便于站长回填 `config.js`
- **主题文档放置位置**：
  - 避免把 Markdown 文档直接放在 `themes/<theme>/` 下（部分构建链路会把主题目录当运行时模块处理）
  - 主题说明建议统一放在 `docs/themes/`
- **页面跳转体感**：补轻量过渡动效，接近源主题的交互节奏。

