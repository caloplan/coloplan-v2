# CaloPlan v2 — React Native (Web) 客户端

移动优先的营养助手 UI 原型，基于 **React Native + react-native-web + Vite**。
展示层与交互层复用既有 CaloPlan 业务模块，RN 不承载领域逻辑。

## 快速开始

```bash
pnpm install
cp .env.example .env   # 可选：按需覆盖微服务地址（默认值见 src/config/microservices.ts）
pnpm dev        # http://localhost:5173
pnpm build      # tsc -b && vite build
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

- `src/sdk/` — 真实 SDK 实现（复制自 `server-meta-admin/src/sdk`，既有基础设施），仅负责 HTTP + Token
- `src/services/` — SDK 组装 + 登录态 + 业务模块注入（`createCPCore` / `createCPUser` / `createCPChat` / `createCPCache`）
- `src/demo/` — Demo 模式 mock 数据（未登录 / 服务不可达时的 UI 原型数据，不进入 caloplan-* 模块）
- `src/hooks/` — 页面数据 Hook（登录态 → 真实模块；匿名 → demo 数据）
- `src/components/` + `src/screens/` — 展示层

## 导航

Header Navigation：`Today / Meals / AI` 页签 + 右上 `Account`。不使用底部 Tab / Drawer。

## 数据流

| 页面 | 业务模块 | 说明 |
| --- | --- | --- |
| Today | caloplan-user（body / nutrition）+ caloplan-core（meal） | 身体数据、营养目标、今日进度、今日餐食、快捷操作 |
| Meals | caloplan-core（meal / food 仓储 + 实体工厂） | 早/午/晚/加餐、添加食物、份量调整、删除 |
| AI | caloplan-chat → fastapi-chat-service | 会话、流式、加载/错误态、待审批确认/取消、图片识别 |
| Account | caloplan-user（UserService）+ 登录态 | 登录/注册、登出、注销账号、偏好、关于 |

Token 持久化经 `caloplan-cache` → localStorage，RN 不直接访问 LocalStorage。

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
部署时可用同名 `VITE_*` 环境变量覆盖（优先级高于配置文件）：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `microservices.user` / `VITE_USER_URL` | `http://localhost:8000` | mservice-fastapi-user |
| `microservices.meta` / `VITE_META_URL` | `http://localhost:9093` | mservice-fastapi-metastorage |
| `microservices.chat` / `VITE_CHAT_URL` | `http://localhost:9095` | fastapi-chat-service |
| `microservices.file` / `VITE_FILE_URL` | `http://localhost:9094` | fastapi-file-service（图片上传） |
| `VITE_DEMO_MODE` | `true` | 未登录时展示 Demo 数据 |

服务地址还可在 Account 登录表单中按会话临时修改（不写回配置文件）。

## 目录结构

```
src/
  sdk/            meta-sdk / user-sdk（复制自 server-meta-admin）
  services/       env / sdk / bootstrap（登录态 + 模块注入）
  demo/           demoData / demoChat（仅原型）
  hooks/          useAuth / useToday / useMeals / useChat
  components/     HeaderNavigation / NutritionSummary / MealCard / ChatMessage …
  screens/        TodayScreen / MealsScreen / AIScreen / AccountScreen
  theme/          设计令牌（颜色 / 间距 / 字号）
  utils/          展示层格式化工具
docs/screenshots/ 各页面截图
```
