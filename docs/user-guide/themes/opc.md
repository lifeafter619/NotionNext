# Opc 主题

> 主题 ID：`opc` · 预览：[preview.tangly1024.com/?theme=opc](https://preview.tangly1024.com/?theme=opc)

## 主题预览

![Opc 主题预览](/images/themes-preview/opc.webp)

## 简介

Opc 是面向个人主页、一人公司和独立开发者的入口主题。首页突出个人品牌、主项目、长期记录，以及多个 AI 组织协作的工作流。

## 主题特性

- **定位**：个人主页 / 一人公司入口。
- **主路径**：保留 NotionNext 项目和长期记录两个主要按钮。
- **工作流展示**：用三步卡片和协作方法说明 AI 组织如何判断方向、分配任务、文档交接与监督修正。
- **近况模块**：展示最近推进的游戏、小说、短剧、工具产品、流量媒体、AI 企业工作流和量化交易方向。
- **配色配置**：支持浅色和深色基础色变量。
- **信息配置**：支持在主题控制台调整首页主要文案与链接。

## 适用场景

- 独立开发者个人主页
- 一人公司入口页
- AI 工作流展示页
- 个人品牌和长期记录入口

## 启用方式

1. Notion Config 表：`THEME` = `opc`
2. 环境变量：`NEXT_PUBLIC_THEME=opc`
3. `blog.config.js` 的 `THEME`

## 配置说明

配置文件：[themes/opc/config.js](https://github.com/notionnext-org/NotionNext/blob/main/themes/opc/config.js)

也可以在 **Notion Config** 表中填写同名键覆盖默认值。

<!-- theme-config-table -->

### 常用信息配置

| 配置键 | 说明 |
| --- | --- |
| `OPC_NAME` | 顶部名称 |
| `OPC_KICKER` | 首屏标签 |
| `OPC_TITLE` | 主标题 |
| `OPC_SUBTITLE` | 副标题 |
| `OPC_DESCRIPTION` | 主介绍 |
| `OPC_PRIMARY_TEXT` | 主按钮文字 |
| `OPC_PRIMARY_URL` | 主按钮链接 |
| `OPC_SECONDARY_TEXT` | 副按钮文字 |
| `OPC_SECONDARY_URL` | 副按钮链接 |
| `OPC_STATUS_TEXT` | 状态标签 |
| `OPC_CARD_TITLE` | 工作流卡片标题 |
| `OPC_CARD_DESCRIPTION` | 工作流说明 |
| `OPC_NOW_TITLE` | 近况标题 |
| `OPC_NOW_DESCRIPTION` | 近况说明 |
| `OPC_NOW_ITEMS` | 近况标签，英文逗号分隔 |

### 配色配置

Opc 支持主题控制台调整浅色和深色基础色：

| 配置键 | 说明 |
| --- | --- |
| `OPC_COLOR_PRIMARY` | 浅色主色 |
| `OPC_COLOR_BG` | 浅色页面背景 |
| `OPC_COLOR_CARD` | 浅色卡片背景 |
| `OPC_COLOR_TEXT` | 浅色主文字 |
| `OPC_COLOR_TEXT_SECONDARY` | 浅色次级文字 |
| `OPC_COLOR_BORDER` | 浅色边框 |
| `OPC_COLOR_PRIMARY_DARK` | 深色主色 |
| `OPC_COLOR_BG_DARK` | 深色页面背景 |
| `OPC_COLOR_CARD_DARK` | 深色卡片背景 |
| `OPC_COLOR_TEXT_DARK` | 深色主文字 |
| `OPC_COLOR_TEXT_SECONDARY_DARK` | 深色次级文字 |
| `OPC_COLOR_BORDER_DARK` | 深色边框 |

<!-- /theme-config-table -->

## 相关

- [内置主题全览](./THEMES_CATALOG.md)
- [如何配置站点](../config-site.md)
