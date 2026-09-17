# CaloPlan v2 — React Native (Web) 客户端

移动优先的营养助手 UI 原型，基于 **React Native + react-native-web + Vite**。
展示层与交互层复用既有 CaloPlan 业务模块，RN 不承载领域逻辑。

## 相关项目（CaloPlan 全家桶）

CaloPlan 全栈项目统一托管在 GitHub Organization [caloplan](https://github.com/caloplan)：

| 类型 | 项目 | 与本项目关系 |
| --- | --- | --- |
| 前端（本仓库） | [coloplan-v2](https://github.com/caloplan/coloplan-v2) | CaloPlan v2 客户端 |
| SDK | [caloplan-user](https://github.com/caloplan/caloplan-user) | 登录 / 用户 / 身体数据（Today / Account 页） |
| SDK | [caloplan-core](https://github.com/caloplan/caloplan-core) | 餐食 / 食物仓储（Meals 页） |
| SDK | [caloplan-chat](https://github.com/caloplan/caloplan-chat) | AI 对话（AI 页） |
| SDK | [caloplan-cache](https://github.com/caloplan/caloplan-cache) | Token / 数据缓存（本地持久化） |
| 服务 | [fastapi-chat-service](https://github.com/caloplan/fastapi-chat-service) | AI 对话后端（SSE） |
| 服务 | [fastapi-file-service](https://github.com/caloplan/fastapi-file-service) | 图片上传后端 |
| 服务 | [mservice-fastapi-user](https://github.com/caloplan/mservice-fastapi-user) | 认证 / 用户微服务 |
| 服务 | [mservice-fastapi-metastorage](https://github.com/caloplan/mservice-fastapi-metastorage) | 食物 / 餐食 / 营养元数据微服务 |

本项目为最上层前端：业务能力经 `caloplan-*` SDK 组装，最终由四个 FastAPI 微服务支撑。

## 快速开始

```bash
pnpm install
cp .env.example .env   # 可选：按需覆盖微服务地址（默认值见 src/config/microservices.ts）
pnpm dev               # vite 默认 http://localhost:5173；本地常用：pnpm exec vite --port 3000 --strictPort
pnpm build             # tsc -b && vite build
pnpm lint
```

## 架构

```
                    CaloPlan RN (coloplan-v2)
                         |
        +----------------+----------------+
        |                |                |
        ↓                ↓                ↓
      Today            Meals              AI
        |                |                |
        ↓                ↓                ↓
  caloplan-user    caloplan-core   caloplan-chat
                         |                |
                         ↓                ↓
                    Meta / Cache     Chat Service
```

- `src/sdk/` — 真实 SDK 实现（meta-sdk / user-sdk），仅负责 HTTP + Token
- `src/services/` — SDK 组装 + 登录态 + 业务模块注入（`createCPCore` / `createCPUser` / `createCPChat` / `createCPCache`）
- `src/services/cache.ts` — 统一缓存单例 + SWR 加载（先旧后新）
- `src/demo/` — Demo 模式 mock 数据（未登录 / 服务不可达时的 UI 原型数据，不进入 caloplan-* 模块）
- `src/hooks/` — 页面数据 Hook（登录态 → 真实模块；匿名 → demo 数据）
- `src/components/` + `src/screens/` — 展示层

## 导航

Header Navigation：`Today / Meals / AI` 页签 + 右上 `Account`。不使用底部 Tab / Drawer。

## 数据流

| 页面 | 业务模块 | 说明 |
| --- | --- | --- |
| Today | caloplan-user（body / nutrition）+ caloplan-core（meal） | 身体数据、营养目标、今日进度、今日餐食（缓存）、运动卡片占位 |
| Meals | caloplan-core（meal / food 仓储） | 餐食列表 + 食物库；**餐食/食物创建全部走 AI（pending action 审批），无手动创建入口** |
| AI | caloplan-chat → fastapi-chat-service | 会话、流式（渲染节流）、图片识别、待审批确认/取消 |
| Account | caloplan-user（UserService）+ 登录态 | 登录/注册、登出、注销账号、偏好、关于 |

Token 持久化经 `caloplan-cache` → localStorage，RN 不直接访问 LocalStorage。

## 缓存（SWR：先旧后新）

进入页面先用旧缓存渲染，再请求新数据覆盖，消除"每次进入都要刷新"的等待：

- `src/services/cache.ts`：`dataCache()`（全局单例，bootstrap 初始化）+ `swrLoad(key, producer)`
  - 命中缓存 → 立即返回旧数据（不触网）→ 后台 `refresh` 拉新覆盖；
  - 未命中 → 调 producer 拉取并回写缓存（不重复请求）。
- `useToday.ts`：`caloplan_today_<YYYY-MM-DD>`（body + goal + meals 载荷），meal 查询带 `date`
- `useMeals.ts`：`caloplan_meals`（餐食列表）+ `caloplan_food_library`（食物库，空库回退 mock）
- `useToday.ts` 运动记录：`caloplan_exercise_records`

## 餐食时间戳与查询

- `Meal.createdTime` 落库统一存 **`yyyy-mm-dd`**（caloplan-core `toDateOnly`），
  查询 `listMine({ date })` → meta 服务端 `created_time=2026-09-16` 精确匹配当天。
- 实测请求：`GET /api/v1/entries?type_name=meal&user_id=<id>&created_time=2026-09-16`

## AI 记餐链路（Meals / AI 页）

```
AI 页提问 → caloplan-chat → fastapi-chat-service（Agent + Tool Call）
  → 命中需审批 Tool（create_food / create_meal）→ pending action（taskid 审批流）
  → 用户点「确认执行」→ chat.confirm(taskid) → 服务端执行 tool 写入 meta-service
  → 前端刷新缓存后展示
```

- 食物 / 餐食创建均通过 AI 完成（用户已否决手动创建餐食入口）；
- 确认/取消由 `PendingActionCard` 触发 `useChat.confirm / cancel`。

## 图片识别链路（AI 页）

```
选图 → uploadImage() POST fastapi-file-service /api/v1/files（Bearer token）
     → {key, url} → 缩略图预览
     → sendMessage(sessionId, [{type:"text"},{type:"image_url",imageUrl:url}])
     → caloplan-chat 组装 → 后端 message=内容块数组 → deepseek-flash 视觉识别
```

- 上传集成是单函数 `src/services/upload.ts`（刻意不建 file SDK）；
- Demo 模式（未登录）不上传，直接挂占位图 URL 演示完整 UI 链路；
- 下载公开（随机 UUID URL 即访问凭证），CORS 由部署侧配置。

## 微服务配置

默认地址统一维护在 `src/config/microservices.ts`（改这一个文件即可切换服务），
部署时可用同名 `VITE_*` 环境变量覆盖（优先级：环境变量 > `.env` > 配置文件）：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `microservices.user` / `VITE_USER_URL` | `http://localhost:9092` | mservice-fastapi-user |
| `microservices.meta` / `VITE_META_URL` | `http://localhost:9093` | mservice-fastapi-metastorage |
| `microservices.chat` / `VITE_CHAT_URL` | `http://localhost:9095` | fastapi-chat-service |
| `microservices.file` / `VITE_FILE_URL` | `http://localhost:9094` | fastapi-file-service（图片上传） |
| `VITE_DEMO_MODE` | `true` | 未登录时展示 Demo 数据 |

- `.env.example` 为入库模板，`cp .env.example .env` 后按需修改；`.env` 已被 `.gitignore` 忽略。
- 服务地址还可在 Account 登录表单中按会话临时修改（不写回配置文件）。
- 生产示例：`VITE_USER_URL=http://<server-ip>:51092`、`VITE_META_URL=http://<server-ip>:51093`、`VITE_FILE_URL=http://<server-ip>:51094`、`VITE_CHAT_URL=http://<server-ip>:51095`（`<server-ip>` 替换为实际部署地址，不写入仓库）。

## 目录结构

```
src/
  sdk/            meta-sdk / user-sdk（HTTP + Token）
  services/       env / sdk / bootstrap / cache（登录态 + 模块注入 + SWR 缓存）
  demo/           demoData / demoChat（仅原型）
  hooks/          useAuth / useToday / useMeals / useChat
  components/     HeaderNavigation / NutritionSummary / MealCard / ChatMessage / PendingActionCard …
  screens/        TodayScreen / MealsScreen / AIScreen / AccountScreen
  config/         microservices.ts（微服务默认地址唯一权威来源）
  theme/          设计令牌（颜色 / 间距 / 字号）
  utils/          展示层格式化工具
docs/screenshots/ 各页面截图
```
