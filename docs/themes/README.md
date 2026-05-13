# Themes Documentation

中文 | [English](./README.en.md)

本目录用于统一维护各主题的设计说明、配置说明与迁移注意事项。

## 主题总览

| Theme | 中文文档 | English Docs |
| --- | --- | --- |
| Claude | [CLAUDE.md](./CLAUDE.md) | [CLAUDE.en.md](./CLAUDE.en.md) |
| Endspace | [ENDSPACE.md](./ENDSPACE.md) | [ENDSPACE.en.md](./ENDSPACE.en.md) |
| Fuwari | [FUWARI.md](./FUWARI.md) | [FUWARI.md](./FUWARI.md) |

## 维护约定

- **开发者须知**：主题开发与长期维护成本高；当前以向 **GitHub 主仓库贡献免费可分发主题**为主。后续若上线付费主题与私有仓库交付等机制，以 [主题迁移指南 §8.4](../THEME_MIGRATION_GUIDE.zh-CN.md) 的路线说明及项目公告为准。
- 新增主题时，必须在本目录补齐中英文说明（至少包含功能、配置、启用方式）。
- 主题涉及全局文件改动时，需在主题文档中明确“全局改动影响范围”。
- `docs/README.md` 与 `docs/README.en.md` 仅保留导航，详细说明应收敛到本目录。
- **合并主仓库时**：除 `themes/<id>/` 外，需在 **`public/images/themes-preview/`** 提交与目录名一致的 **`<id>.png`** 与 **`<id>.webp`**（预览封面），并在 **`conf/themeSwitch.manifest.js`** 的 **`THEME_SWITCH_MANIFEST`** 中填写 **`name` / `summary`**（及可选 `cover` / `coverWebp`、`tier`）；详见 [主题迁移指南 §8](../THEME_MIGRATION_GUIDE.zh-CN.md)（[English §8](../THEME_MIGRATION_GUIDE.md)）。本地自建主题可不提交上游，无需此项。
