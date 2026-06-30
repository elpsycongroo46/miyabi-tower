# 星见雅的双耳高塔 — 项目开发文档

## 项目概述

**星见雅的双耳高塔**（Miyabi's Twin-Ear Tower）是一款基于浏览器的物理叠叠乐同人小游戏。玩家控制角色「苍角」在屏幕上方左右移动，点击屏幕释放三角帽，将帽子堆叠在角色「星见雅」的双耳之上。游戏以《绝区零》（Zenless Zone Zero）角色为灵感，采用 Canvas 2D 渲染，支持桌面端与移动端触屏操作。

- **在线地址**：https://elpsycongroo46.github.io/miyabi-tower
- **技术栈**：TypeScript + Vite + Canvas 2D + Web Audio API
- **构建产物大小**：JS 27KB (gzip 9KB) + CSS 4KB (gzip 1KB)
- **运行环境**：所有现代浏览器（Chrome / Safari / Firefox / 移动端 WebView）

---

## 目录结构

```
miyabi/
├── index.html                  # 入口 HTML
├── package.json                # 依赖配置
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 构建配置
├── .github/workflows/deploy.yml # GitHub Actions 自动部署
├── public/assets/
│   ├── miyabi.png              # 星见雅角色图（带透明通道）
│   ├── cangjiao.png            # 苍角角色图（带透明通道）
│   └── maozi.png               # 三角帽图（带透明通道）
└── src/
    ├── main.ts                 # 应用入口
    ├── style.css               # 全局样式
    └── game/
        ├── types.ts            # 类型定义 & 游戏配置常量
        ├── Game.ts             # 主控制器（状态机/游戏循环/渲染）
        ├── Cangjiao.ts         # 苍角控制器（sin 曲线移动）
        ├── Hat.ts              # 帽子实体类
        ├── UIManager.ts        # DOM UI 管理器
        ├── AudioManager.ts     # Web Audio API 音效
        ├── ResourceManager.ts  # 图片资源加载与缓存
        ├── Storage.ts          # localStorage 持久化
        └── Prefabs.ts          # 背景 Canvas 绘制
```

---

## 架构设计

### 核心循环

```
requestAnimationFrame
  ├── update(dt)
  │   ├── 苍角移动（正弦曲线，速度随层数递增）
  │   ├── 帽子下落（匀加速运动，世界空间坐标系）
  │   ├── 落地检测（帽子底边中点 X 是否在耳朵线段范围内）
  │   ├── 摄像机跟随（最高帽子保持在屏幕 65% 处）
  │   └── HUD 刷新
  └── render()
      ├── 背景（渐变 + 星空，纯代码绘制）
      ├── 星见雅（PNG 图片，含摄像机偏移）
      ├── 已堆叠帽子（按重叠比例层叠）
      ├── 下落中帽子
      └── 苍角 + 手持帽子（屏幕固定，无摄像机偏移）
```

### 坐标体系

- **屏幕空间**：左上角 (0,0)，苍角和持有的帽子在此空间
- **世界空间**：Y=0 位于屏幕顶部（当 cameraY=0 时），用于帽子下落物理
- **转换公式**：screenY = worldY + cameraY

### 双空间设计动机

帽子下落需要物理学计算（重力加速度），而苍角需要固定在屏幕顶部不受摄像机影响。帽子在释放时从屏幕空间转为世界空间（`hat.y -= cameraY`），下落过程中在在世界空间更新，渲染时再转回屏幕空间（`hat.y + cameraY`）。

### 摄像机系统

- 摄像机始终跟随两耳堆叠中较高的一侧
- 最高帽子保持在屏幕 **65%** 高度处（中下部）
- 使用世界空间堆顶坐标（`getWorldStackTopY`）计算目标，避免反馈循环
- 平滑插值跟随（lerp 系数 0.08）

---

## 核心模块说明

### Game.ts — 主控制器（555 行）

管理完整游戏生命周期：状态机（MENU → PLAYING → PAUSE / GAME_OVER / GAME_WIN）、资源加载、布局计算、物理循环、渲染调度。

**关键方法**：

| 方法 | 职责 |
|------|------|
| `computeLayout()` | 计算 Miyabi 图片位置、耳朵线段屏幕坐标、帽子/苍角渲染尺寸 |
| `dropHat()` | 帽子释放：转为世界空间、开始下落、400ms 后生成新帽 |
| `update(dt)` | 每帧更新：苍角移动、帽子物理、落地检测、摄像机跟随 |
| `checkLanding(x5)` | 判定帽子底边中点 X 是否落在某个耳朵线段范围内 |

### Cangjiao.ts — 苍角控制器（43 行）

- 使用 `Math.sin(phase)` 实现平滑往复移动
- 移动速度随堆叠层数线性增长，设有上限
- 位置为屏幕空间，不受摄像机影响

### Hat.ts — 帽子实体（33 行）

纯数据类，无外部依赖。字段包括：坐标（x, y）、尺寸（width, height）、状态（holding/falling/settled/dropped）、垂直速度（vy）、耳朵归属（side）、层数（layer）。

### UIManager.ts — UI 管理（458 行）

管理全部 DOM 界面：
- **主菜单**：游戏标题、历史最高分、开始按钮
- **HUD**：暂停按钮、当前身高、左右堆叠数、平衡差值
- **暂停弹窗**：继续/退出按钮 + 版权声明
- **失败弹窗**：失败原因、统计数据、重新开始
- **成功弹窗**：最终身高、帽子总数、新纪录提示
- **素材编辑器**：可替换/调整三张 PNG 素材的缩放、位置、旋转等
- **文案闪现**：特定层数触发角色对话

### AudioManager.ts — 音效（60 行）

使用 Web Audio API 的 OscillatorNode 合成音效，无需加载外部音频文件。包含四种音效：叠帽成功（双频短促三角波）、帽子滑落（低频锯齿波）、游戏失败（双频下行）、游戏胜利（三频上行旋律）。

### ResourceManager.ts — 资源管理（138 行）

- 启动时自动加载 `public/assets/` 下的三张 PNG 图片
- 支持运行时通过素材编辑器上传临时图片替换
- 素材调整参数（缩放、偏移、旋转、透明度等）持久化到 localStorage

---

## 游戏机制

### 落点判定算法

1. 星见雅图片中预定义两条水平线段（左耳 `x1~x2`、右耳 `x3~x4`），线段 Y 坐标由 `earYFromBottom` 参数决定
2. 帽子下落过程中，当帽子中心 Y 到达堆顶高度时触发判定
3. 取帽子底边中点 X 坐标 `x5 = hat.bottomCenterX`
4. 若 `x5 ∈ [leftEarX1, leftEarX2]` 或 `x5 ∈ [rightEarX1, rightEarX2]`，则成功落在对应耳朵上
5. 否则标记为掉落

### 堆叠机制

- 帽子宽度自动匹配耳朵线段宽度，高度按原图比例缩放
- 堆叠间距 = `hatRenderH × (1 - hatStackOverlap)`，`hatStackOverlap=0.55` 表示 55% 高度被上层帽子覆盖
- 实现尖顶帽嵌套堆叠的视觉效果

### 失败条件

| 条件 | 触发值 | 说明 |
|------|--------|------|
| 平衡失败 | `|左 - 右| > 5` | 双耳帽子数差超过 5 |
| 掉落失败 | `dropCount > 5` | 超过 5 顶帽子未命中耳朵 |

### 计分

- 初始身高 100cm，每顶帽子 +5cm
- 身高按双耳中较高的一侧计算
- 历史最高分持久化到 localStorage

### 剧情文案

在堆叠层数达到 [5, 10, 15, 20, 30, 50] 时触发，显示角色对话 2.2 秒后消失。

---

## 配置常量速查

| 参数 | 默认值 | 位置 | 说明 |
|------|--------|------|------|
| `earYFromBottom` | 0.90 | types.ts:28 | 耳朵 Y 在图片上的比例（距底边） |
| `leftEarX1/X2` | 0.31/0.47 | types.ts:24-25 | 左耳线段 X 范围（相对图片宽度） |
| `rightEarX1/X2` | 0.53/0.69 | types.ts:26-27 | 右耳线段 X 范围 |
| `hatGravity` | 900 | types.ts:22 | 帽子重力加速度 (px/s²) |
| `hatStackOverlap` | 0.55 | types.ts:23 | 帽子堆叠重叠比例 |
| `cangjiaoBaseSpeed` | 1.5 | types.ts:27 | 苍角基础移动速度 |
| `cangjiaoMaxSpeed` | 5.5 | types.ts:29 | 苍角最高速度 |
| `maxBalanceDiff` | 5 | types.ts:36 | 平衡差上限 |
| `maxDropCount` | 5 | types.ts:37 | 掉落上限 |
| `h * 0.65` | - | Game.ts:428 | 最高帽子在屏幕的位置 |

---

## 部署

使用 GitHub Actions 自动部署到 GitHub Pages。推送任意提交到 `main` 分支后，workflow 自动执行 `npm install → tsc → vite build → upload-pages-artifact → deploy-pages`。详见 `.github/workflows/deploy.yml`。

### 手动构建

```bash
npm install       # 安装依赖
npm run dev       # 开发服务器 (localhost:5173)
npm run build     # 生产构建 → dist/
npm run preview   # 预览生产构建
```

---

## 技术亮点

1. **双坐标系架构**：屏幕空间（UI/苍角）与世界空间（帽子物理/摄像机）分离，摄像机移动不影响交互逻辑
2. **正弦曲线 AI 对手**：苍角移动速度随堆叠层数自适应增长，营造渐进式难度曲线
3. **线段判定算法**：将 2D 碰撞检测简化为水平线段 X 范围判定，高效且易于校准
4. **Web Audio 合成音效**：无需加载音频文件，纯代码合成所有游戏音效
5. **DPR 自适应 Canvas**：支持 Retina 高清屏，画面清晰无锯齿
6. **零外部框架**：仅依赖 Vite 构建工具，运行时无任何第三方库
