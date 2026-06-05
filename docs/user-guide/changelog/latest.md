# 最新版本与更新日志

> 当前主线：**4.10.0**（见根目录 `package.json`）

## 4.10.0 发布要点

本版本是一次以「多主题站点性能」为核心的较大版本更新。目标是在保留现有主题视觉、站点配置和插件能力的前提下，减少浏览器首屏负担，降低高频滚动场景的主线程压力，并把页面数据体积纳入可验收的性能预算。

### 性能优化

- 首页和列表页默认只向浏览器发送文章卡片所需的摘要字段，避免把完整 Notion 页面对象序列化进 `__NEXT_DATA__`。
- 文章页保留渲染所需 `blockMap`，同时清理 Notion 内部版本、权限、空间、编辑时间等客户端不需要的元数据。
- `latestPosts`、上一篇/下一篇、推荐文章等数据统一走轻量摘要结构，减少主题切换、列表渲染和 hydration 阶段的 JSON 解析成本。
- `type=notice` 公告内容会清理无关 block 与 collection 数据，但仍保留 NotionPage 渲染和内部链接转换所需结构。
- 新增 `yarn perf:page-data`，可在 `yarn build` 后扫描 `.next/server/pages/*.json` 并生成 `.perf/page-data-budget.json`，用于检查页面数据是否超过默认 128KB 预算。

### 多主题体验

- 批量优化主题目录、进度条、返回顶部、浮动按钮等滚动监听，使用 `passive: true` 和 `requestAnimationFrame` 降低滚动时的同步阻塞。
- Next 与 Endspace 主题合并重复滚动管线，减少同一页面内多个组件重复计算阅读进度和目录激活状态。
- Typography 搜索高亮改为按需加载和空闲时执行，避免首页、文章页提前加载搜索高亮逻辑。
- 全局外部插件、站点自定义 CSS/JS 和 `GLOBAL_JS` 改为浏览器副作用阶段执行，降低服务端渲染和初始渲染阶段的副作用风险。

### 修复与回归保护

- 保留并验证 `allLinkPages` 链接解析逻辑，避免公告栏 `type=notice` 中指向 `type=Page` 的 Notion 内链再次退化为 raw Notion page id 并产生 404。
- 新增 `convertInnerUrl` 回归测试，覆盖公告内容中 raw Notion page id 通过 `allLinkPages` 转为站内 Page 链接的路径。
- 保持 `allNavPages` 仍为 post-only，避免影响主题文章导航、随机文章和推荐文章等既有用法。

### 验收结果

- `yarn -s type-check`：通过。
- `yarn -s build`：通过。
- `yarn -s perf:page-data`：通过，构建后真实页面 `overBudgetPages: 0`。
- 首页 page-data 从约 291KB 降至约 37KB；开发态浏览器烟测中首页 `__NEXT_DATA__` 约 34.5KB。
- `/article/guide?theme=endspace` 浏览器烟测通过，控制台无新增错误。

> 说明：当前工作区直接运行 Jest 仍会被既有 `canvas.node` 原生绑定缺失问题阻塞；新增回归测试文件本身已通过 ESLint，并用运行态脚本验证了核心链接映射逻辑。

## 如何升级

- 站长升级：见 [版本升级指引](../update.md)。
- 构建性能与 Notion API 限流：见 [构建性能与 Notion API 限流](../deploy/build-tuning.md)。
- GitHub Release：[NotionNext Releases](https://github.com/notionnext-org/NotionNext/releases)。

## 历史版本全文

- [V4 历史](./v4-history.md)
- 源站：https://docs.tangly1024.com/article/latest
