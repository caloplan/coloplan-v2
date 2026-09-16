# CaloPlan v2 — React Native (Web) 客户端

移动优先的营养助手 UI 原型，基于 **React Native + react-native-web + Vite**。
展示层与交互层复用既有 CaloPlan 业务模块，RN 不承载领域逻辑。

## 快速开始

```bash
pnpm install
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
| AI | caloplan-chat → fastapi-chat-service | 会话、流式、加载/错误态、待审批确认/取消 |
| Account | caloplan-user（UserService）+ 登录态 | 登录/注册、登出、注销账号、偏好、关于 |

Token 持久化经 `caloplan-cache` → localStorage，RN 不直接访问 LocalStorage。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_USER_URL` | `http://localhost:8000` | mservice-fastapi-user |
| `VITE_META_URL` | `http://localhost:9093` | mservice-fastapi-metastorage |
| `VITE_CHAT_URL` | `http://localhost:9095` | fastapi-chat-service |
| `VITE_DEMO_MODE` | `true` | 未登录时展示 Demo 数据 |

服务地址可在 Account 登录表单中临时修改。

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
