# 参与社区

NotionNext 已由个人仓库移交至组织 **[notionnext-org](https://github.com/notionnext-org)**，欢迎**既是站长又是开发者**的参与者一起维护代码与文档。所有参与代码、主题、文档、Issue、Review 与发布维护的贡献者，都会在 [致谢页](./acknowledgements.md) 与 GitHub 贡献记录中被看见。

## 四步参与路径

```text
1. 使用站点 / 读文档
       ↓
2. 提问（Discussions 或 Issue）
       ↓
3. 贡献（文档 PR 或代码 PR）
       ↓
4. 成为维护者（可选，认领负责域）
```

### 1. 使用与阅读

- **在线文档**：[notionnext.tangly1024.com](https://notionnext.tangly1024.com)  
- **快速开始**：[介绍](./intro.md) → [Vercel 部署](./deploy-vercel.md)  
- **旧版 Notion 教程**：[docs.tangly1024.com](/user-guide/intro)（历史截图）

### 2. 提问与讨论

| 场景 | 去哪里 |
| --- | --- |
| 部署/配置「怎么用」 | [GitHub Discussions · 使用问答](https://github.com/notionnext-org/NotionNext/discussions) |
| 某篇教程不清楚 | 该页底部 **文档反馈**（Giscus）或 [Discussions · 文档](https://github.com/notionnext-org/NotionNext/discussions) |
| 确认是 Bug | [Bug Report Issue](https://github.com/notionnext-org/NotionNext/issues/new/choose) |
| 功能想法 | 先在 [Discussions · 想法](https://github.com/notionnext-org/NotionNext/discussions) 对齐，再开 Issue |

技术问题**优先 GitHub**，便于搜索与志愿者接手。微信群/Telegram 见 [交流社群](./help/community.md)（非官方 SLA）。

### 3. 第一次贡献（推荐从文档开始）

1. Fork [notionnext-org/NotionNext](https://github.com/notionnext-org/NotionNext)  
2. 编辑 `docs/user-guide/**/*.md`（或修复带 `good first issue` 的 Issue）  
3. 本地预览：`yarn docs:site:dev`  
4. 按 [CONTRIBUTING.zh-CN.md](https://github.com/notionnext-org/NotionNext/blob/main/CONTRIBUTING.zh-CN.md) 提 PR  

详细流程：[参与维护在线文档](./maintain-docs.md) · [维护工作流](./MAINTENANCE_WORKFLOW.md) · [致谢](./acknowledgements.md)

**改代码 / 主题**：阅读 [开发者文档（GitHub）](https://github.com/notionnext-org/NotionNext/blob/main/docs/developer/README.md) · [贡献指南](https://github.com/notionnext-org/NotionNext/blob/main/CONTRIBUTING.zh-CN.md) · 大改动先写 [RFC（GitHub）](https://github.com/notionnext-org/NotionNext/blob/main/docs/developer/rfc/README.md)

### 4. 成为维护者与加入组织

- 完成 **1～2 个合并 PR** 后，在 [Discussions](https://github.com/notionnext-org/NotionNext/discussions) **自荐**负责域（文档 / CI / 某主题等）  
- 规则见 [GOVERNANCE.zh-CN.md](https://github.com/notionnext-org/NotionNext/blob/main/GOVERNANCE.zh-CN.md) · 名单 [MAINTAINERS.md](https://github.com/notionnext-org/NotionNext/blob/main/MAINTAINERS.md)

::: info 已符合条件但未被邀请？
若你已满足组织协作的合并 PR 等条件，却**尚未收到组织邀请**，请到 **[GitHub Discussions 发帖](https://github.com/notionnext-org/NotionNext/discussions/new/choose)**（可选用「组织成员申请」模板），标题写 **组织成员申请**，并附上 GitHub 用户名、已合并 PR 链接与希望负责的域。维护者会在讨论区按队列回复，邀请可能有延迟。
:::

## 行为与治理

- [行为准则（CODE_OF_CONDUCT）](https://github.com/notionnext-org/NotionNext/blob/main/CODE_OF_CONDUCT.md)  
- [项目治理](https://github.com/notionnext-org/NotionNext/blob/main/GOVERNANCE.zh-CN.md)  
- [维护与变更尺度（GitHub）](https://github.com/notionnext-org/NotionNext/blob/main/docs/developer/MAINTENANCE_PHILOSOPHY.zh-CN.md)

## 当前最需要帮助的事

在仓库 [Issues](https://github.com/notionnext-org/NotionNext/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) 中筛选 **`good first issue`** 与 **`help wanted`**，常见包括：

- 文档迁移、错别字与 4.9.x 配置说明同步  
- 单主题说明或截图更新  
- 翻译与 `lib/lang` 补充  

维护者会在 [Discussions](https://github.com/notionnext-org/NotionNext/discussions) 置顶「欢迎贡献」帖；草稿见 [PINNED_DISCUSSION_POSTS.zh-CN.md](../community/PINNED_DISCUSSION_POSTS.zh-CN.md)。
