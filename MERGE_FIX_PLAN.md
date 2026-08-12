# 上游合并前修复方案

日期：2026-08-10

## 结论

当前不要合并或推送。必须先完成 P0 项，并让 ESLint、Jest、TypeScript 和生产构建全部通过。依赖审计的 High 风险应在本次合并前一并清除。

## 审查范围

- 本地主线：`main` / `origin/main`，`1b1a14d5`
- 待合入上游：`upstream/main`，`5f3b36b1 feat: add OpenAI compatible AI chat proxy`
- 本地提交审查周期：`6f384809..1b1a14d5`，共 34 个提交
- 隔离预演：`.worktrees/review-upstream-ai-chat-20260810`
- 合并冲突：仅 `docs/user-guide/plugins/overview.md`，属于 Markdown 表格格式冲突

## P0：合并阻塞项

### 1. 加固 AI 聊天代理

文件：`functions/api/ai-chat.ts`

已确认的问题：

- `150-169`：只信任 `Content-Length`；无该请求头时，大请求体可绕过 20 KB 限制。
- `165-166`：`request.json()` 位于错误处理外；畸形 JSON 会抛出未处理异常，JSON `null` 会触发属性读取异常。
- `166-196`：空消息也会调用付费模型；请求体没有结构、角色、内容和数量校验。
- `55-73`、`150-196`：CORS 只控制浏览器读取响应，不是服务端授权；直接 HTTP 客户端仍可调用付费代理。
- `76-83`、`189-192`：温度只有下限，没有 DeepSeek 所要求的最大值 `2`。

修复步骤：

1. 在解析前读取实际请求字节并按 UTF-8 字节数限制为 `MAX_REQUEST_BYTES`；`Content-Length` 只作为提前拒绝条件，不能作为唯一限制。
2. 把读取和 JSON 解析放入 `try/catch`，畸形 JSON 返回 `400`；要求 body 为非空对象。
3. 校验 `messages` 为非空数组，只接受允许的 role；content 必须是非空文本或有效文本 part，并限制消息数、单条长度和总长度。空问题不得调用上游模型。
4. 添加真正的服务端滥用防护：按客户端/IP 和时间窗口限流，同时设置每日请求或 token 配额；超限返回 `429`。若部署环境没有可用的限流/配额绑定，则默认禁用公开代理，而不是依靠 CORS。
5. 对有 `Origin` 的请求拒绝不在白名单内的来源；保留说明：该检查只能作为附加防护，不能替代限流或授权。
6. 将 temperature 限制在 `0..2`；非法配置回退到默认值。
7. 为模型请求设置超时，并将提供方的非 JSON、超时和网络错误统一映射为受控的 `502/504`，不要泄露 API key 或内部响应。

必须新增的单元测试：

- 畸形 JSON、`null`、非对象 body
- 无 `Content-Length` 且实际超过 20 KB
- 空数组、空用户问题、非法 role/content、消息过多
- 不允许的 Origin 不得调用模型
- 限流/配额超限不得调用模型
- temperature 小于 0、超过 2、非数字
- 缺少 API key、上游超时、非 JSON 响应、正常请求

验收：所有拒绝场景均断言 mock `fetch` 未被调用；正常场景返回受控 JSON。

### 2. 修复 HEO 失效测试并恢复归档覆盖

根因：提交 `bdaf393e` 删除了 `themes/heo/components/BlogPostArchive.js`，但测试仍引用它。

失效引用：

- `__tests__/themes/heo/SemanticMarkup.test.js:139`
- `__tests__/themes/heo/LayoutResponsiveControls.test.js:126`
- `__tests__/themes/heo/ConfigRendering.test.js:42`
- `__tests__/themes/heo/PostCoverFallback.test.js:2,248`

修复步骤：

1. 删除 3 个无效 mock、旧 import 和只针对已删除组件的旧用例。
2. 为替代组件 `themes/heo/components/ArchiveTimeline.js` 增加回归测试，至少覆盖年份分组、文章链接/日期渲染、空数据和不修改输入数据。
3. 若归档封面回退仍是产品需求，则在当前真实承载该逻辑的组件上重写测试；不要仅删除覆盖。

已做诊断性验证：临时移除旧引用后，相关 4 个套件共 28 个现有用例全部通过；临时改动已恢复。真实代码状态下完整 Jest 为 `4 failed, 168 passed`，`783` 个已执行断言通过，但 CI 仍会因 4 个套件加载失败而失败。

### 3. 修复 ESLint error

文件：

- `components/PrismMac.js:244`：分离调用 `window.requestAnimationFrame`，触发 `@typescript-eslint/unbound-method`。
- `components/WalineComponent.js:202,274`：保存 `window.fetch` 后直接调用，丢失接收者并触发同一规则。

最小修复：

- 用箭头函数包装浏览器方法，例如 `callback => window.requestAnimationFrame(callback)`。
- 将原始 fetch 包装为 `(...args) => window.fetch(...args)`，或显式绑定 `window`。
- 运行现有 Waline 和 Prism 相关测试，确认包装没有改变参数、返回值和异常传播。

当前完整 ESLint：`232 problems (2 errors, 230 warnings)`。CI 会因 2 个 error 退出失败；230 个 warning 不应在本次修复中机械改写，优先单独治理 `react-hooks/exhaustive-deps`，避免批量自动修复引入行为变化。

## P1：本次合并前处理

### 4. 清除 High 级依赖漏洞

当前生产依赖审计：

```text
@next/bundle-analyzer
  -> webpack-bundle-analyzer
  -> ws@7.5.10
```

- 风险：内存耗尽型 DoS
- 修复版本：`ws >= 7.5.11`
- 当前结果：`1 High`，审计退出码为 `1`

修复步骤：

1. 优先升级 `@next/bundle-analyzer` / `webpack-bundle-analyzer` 到会解析出已修复 `ws` 的兼容版本。
2. 如果上游包暂未更新，使用 Yarn 1 的定向 `resolutions` 只覆盖 `webpack-bundle-analyzer` 的 `ws` 到兼容的 `7.5.11+`；不要用全局 `ws` 8.x 强行覆盖所有依赖。
3. 重新生成 `yarn.lock`，执行 `yarn check --integrity` 和生产依赖审计，要求 High/Critical 为 0。
4. 可将 bundle analyzer 移到 `devDependencies` 以反映其构建用途，但这不能代替漏洞升级。

### 5. 补齐质量门禁覆盖

`package.json:30` 的 lint 当前只覆盖 `pages components lib hooks themes proxy.ts types`，没有覆盖本次新增的 `functions/`，也遗漏 `cloudflare/`、`scripts/`。

修复步骤：

1. 至少立即把 `functions/` 纳入常规 lint；随后把 `cloudflare/`、`scripts/` 纳入同一门禁或建立明确的独立 lint 命令。
2. 为 `.mjs/.cjs` 明确 ESLint 扩展和 Node 环境，避免目录被列入但文件仍未扫描。
3. CI 直接调用该统一命令，要求 0 error。

### 6. 删除过时的版本重复源

`scripts/final-validation.js:191-194` 将 Next.js 硬编码为 `^16.2.6`，而 `package.json:90` 已是 `^16.2.11`。

修复步骤：删除这类与 `package.json` 重复的精确版本判断，版本一致性由 `package.json`、`yarn.lock` 和 CI 的 `--frozen-lockfile` 保证。健康报告不能作为 lint、test、type-check、build 的替代品。

## P2：合并整理

1. 解决 `docs/user-guide/plugins/overview.md` 冲突：保留本地对齐格式并加入 “OpenAI 兼容 AI 助手” 行。
2. 清理已发现的空白问题：
   - `cloudflare/notion-image-proxy/worker.test.mjs:1096`
   - `components/CommonScript.js:123`
   - `themes/proxio/components/Team.js:7`
3. 执行 `git diff --check`，要求无输出。

## 最终验收顺序

在隔离分支完成修复后按下列顺序执行；任一失败都停止合并：

```powershell
.\node_modules\.bin\eslint.cmd pages components lib hooks themes functions cloudflare scripts proxy.ts types --ext .js,.jsx,.mjs,.cjs,.ts,.tsx
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\jest.cmd --runInBand --passWithNoTests
yarn.cmd audit --groups dependencies --level high
.\node_modules\.bin\cross-env.cmd BUILD_MODE=true .\node_modules\.bin\next.cmd build --webpack
yarn.cmd docs:build
git diff --check
git status --short --branch
```

通过条件：

- ESLint 0 error
- Jest 172/172 套件加载并通过，且新增 AI 代理与 ArchiveTimeline 测试通过
- TypeScript 退出码 0
- 生产依赖 High/Critical 为 0
- Next.js 与 VitePress 构建退出码 0
- 无未解决冲突、无意外生成文件、无空白错误

满足以上条件后才提交合并结果并推送。
