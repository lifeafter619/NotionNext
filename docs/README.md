# NotionNext 文档（`docs/`）

| | |
| --- | --- |
| **在线阅读** | [https://notionnext.tangly1024.com](https://notionnext.tangly1024.com) |
| **参与社区** | [user-guide/community-participate.md](./user-guide/community-participate.md) · [GOVERNANCE.zh-CN.md](../GOVERNANCE.zh-CN.md) |
| **参与维护** | 在线页底「在 GitHub 上维护此页」· [user-guide/maintain-docs.md](./user-guide/maintain-docs.md) |
| **致谢贡献者** | [user-guide/acknowledgements.md](./user-guide/acknowledgements.md) · [Contributors](https://github.com/notionnext-org/NotionNext/graphs/contributors) |
| **旧版手册** | [user-guide/help/legacy-docs.md](./user-guide/help/legacy-docs.md) · 源站 [docs.tangly1024.com](https://docs.tangly1024.com) |

## 本目录结构（仅两类）

```text
docs/
├── index.md                 # 在线站首页
├── DOCUMENTATION_POLICY.md  # 在线：文档维护策略
├── user-guide/              # 在线：站长教程（主体）
└── developer/               # 仅 GitHub：开发者文档与主题长文（不进在线站）
```

### 在线站包含什么

`user-guide/` 全部，以及根目录 `index.md`、`DOCUMENTATION_POLICY.md`。  
构建命令：`yarn docs:site:build` → 发布到 [notionnext.tangly1024.com](https://notionnext.tangly1024.com)。

### 不在在线站的内容

全部在 **[`developer/`](./developer/README.md)**：架构、贡献流程、`GETTING_STARTED`、主题开发者长文（Claude 等）、性能审计等。

---

## 如何改教程并上线

1. 编辑 [`user-guide/`](./user-guide/) 下对应 `.md`  
2. 本地预览：`yarn docs:site:dev`  
3. 合并 `main` → GitHub Actions 自动部署  

详见 [user-guide/maintain-docs.md](./user-guide/maintain-docs.md) · [user-guide/MAINTENANCE_WORKFLOW.md](./user-guide/MAINTENANCE_WORKFLOW.md)

## 社区与治理（仓库根目录）

- [参与社区](./user-guide/community-participate.md)（在线站可见）  
- [GOVERNANCE.zh-CN.md](../GOVERNANCE.zh-CN.md) · [MAINTAINERS.md](../MAINTAINERS.md) · [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)  
- [Discussions](https://github.com/notionnext-org/NotionNext/discussions) · [CONTRIBUTING.zh-CN.md](../CONTRIBUTING.zh-CN.md)

Org 管理员还需在 GitHub 启用 Discussions、Giscus App、分支保护等，见治理文档末尾清单。

## 开发者请进

→ **[developer/README.md](./developer/README.md)**
