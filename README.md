# 剧本设定管理（小说 / 剧本设定管理软件）

一个**本地优先**的小说、剧本设定管理工具：帮助作者集中管理多部作品的人物卡、世界观设定、势力组织、时间线和章节大纲，并支持全局搜索与 JSON 导入 / 导出。

- 纯前端，无后端、无账号；数据保存在浏览器的 IndexedDB 中，自动保存。
- 技术栈：Vite + React 19 + TypeScript，`idb` 封装 IndexedDB。
- 界面全部中文。

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 作品管理 | 多部作品并存，新建 / 编辑 / 删除，每部作品数据彼此独立；支持导出单部或全部作品为 JSON，并可导入 |
| 人物卡 | 姓名、别名、标签、年龄、性别、外貌、性格、背景、备注、头像（本地图片，自动压缩）、所属势力、人物关系（并显示他人对此人的关系） |
| 世界观 | 自定义分类（默认：地点、物品、规则/体系、种族/生物、历史），每个词条含概述、详细设定与标签 |
| 势力 / 组织 | 类型、领袖、成员（与人物卡的“所属势力”双向同步）、简介、目标、势力间关系 |
| 时间线 | 事件按剧情顺序排列，可上下移动；记录时间点、重要程度、描述，关联人物与地点；按人物筛选 |
| 章节大纲 | 卷 → 章 两级结构，可排序；每章含梗概、涉及人物、状态（计划中 / 写作中 / 修改中 / 已完成）、字数统计 |
| 全局搜索 | 在当前作品的全部模块中按关键字搜索，点击结果直接跳转到对应条目 |

## 运行方式

要求 Node.js `^20.19.0 || >=22.12.0`（Vite 8 的最低版本要求，推荐 Node 22 LTS）。

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器，默认 http://localhost:5173
npm run build      # 类型检查 + 生产构建，输出到 dist/
npm run preview    # 本地预览构建产物
npm run lint       # 代码检查
```

构建产物是纯静态文件，可部署到任意静态托管（GitHub Pages、Vercel、Nginx 等），也可以直接用 `npm run preview` 在本机使用。

## 数据与备份

- 所有数据只保存在**当前浏览器**的 IndexedDB 中（数据库名 `novel-setting-manager`）；清除站点数据会导致丢失，请定期在「作品」页点击「导出全部」备份。
- 导出的 JSON 结构：

```json
{
  "format": "novel-setting-manager",
  "version": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "projects": [ { "id": "...", "name": "...", "characters": [], "...": "..." } ]
}
```

- 导入时支持上述完整格式、单个作品对象或作品数组；遇到相同 ID 的作品会询问是覆盖还是作为副本导入。

## 项目结构

```
src/
├─ main.tsx              入口
├─ App.tsx               侧边栏导航 + 模块切换
├─ store.tsx             全局状态（React Context）与自动持久化
├─ navigation.ts         模块定义
├─ types.ts              数据模型
├─ styles.css            全局样式
├─ lib/
│  ├─ db.ts              IndexedDB 读写
│  ├─ factories.ts       各实体的默认值与导入数据规范化
│  └─ utils.ts           工具函数（ID、下载、文件读取、图片压缩）
├─ components/
│  ├─ ui.tsx             表单控件、标签输入、多选选择器、弹窗、空状态
│  └─ ListDetailLayout.tsx  左列表右详情的通用布局
└─ views/                各功能模块页面
   ├─ ProjectsView.tsx
   ├─ CharactersView.tsx
   ├─ WorldView.tsx
   ├─ FactionsView.tsx
   ├─ TimelineView.tsx
   ├─ OutlineView.tsx
   └─ SearchView.tsx
```

## 后续可扩展方向

- 人物关系图谱可视化、时间线按时间轴缩放
- Markdown 编辑与富文本
- 多设备同步（如基于文件 / WebDAV / 云端）
