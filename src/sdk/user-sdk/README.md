# user-sdk

`user-sdk` 是 **user-service** 的 TypeScript 客户端 SDK，提供**认证**（登录 / 注册 / 登出 / 刷新）与**用户信息**能力，内置 access token 自动刷新、401 自动重试与 JWT payload 解析。

> 源码位置：`src/sdk/user-sdk/`（由 user-service 官方 SDK 源码复制而来，可直接引用）
> 入口导出：`src/sdk/user-sdk/index.ts`；也可通过总入口 `src/sdk/index.ts` 引用（见 [导入方式](#导入方式)）

---

## 目录

- [导入方式](#导入方式)
- [快速开始](#快速开始)
- [配置 `UserSdkConfig`](#配置-usersdkconfig)
- [API 参考](#api-参考)
  - [UserSdk 实例方法](#usersdk-实例方法)
  - [AuthService —— `sdk.auth`](#authservice--sdkauth)
  - [UserService —— `sdk.users`](#userservice--sdkusers)
- [Token 自动刷新机制](#token-自动刷新机制)
- [类型定义](#类型定义)
- [错误处理](#错误处理)
- [HTTP 适配器](#http-适配器)
- [浏览器端使用示例](#浏览器端使用示例)
- [已知限制](#已知限制)
- [目录结构](#目录结构)

---

## 导入方式

| 来源 | 可导入内容 |
| --- | --- |
| `@/sdk`（总入口） | `UserSdk`、`UserSdkConfig`、全部 user 类型、错误类、`FetchAdapter`、`Logger`、单例工厂 |
| `@/sdk/user-sdk`（本包入口） | 上述全部，外加 `AxiosAdapter`、`decodeJwtPayload` |

> **注意**：`AxiosAdapter` 与 `decodeJwtPayload` **未从总入口 `@/sdk` 导出**，需要时请从 `@/sdk/user-sdk` 导入：
>
> ```ts
> import { decodeJwtPayload, AxiosAdapter } from '@/sdk/user-sdk'
> ```
>
> 项目内同时提供单例工厂 `createUserSdk()`，见 [浏览器端使用示例](#浏览器端使用示例)。

---

## 快速开始

```ts
import { UserSdk, FetchAdapter } from '@/sdk'

const sdk = new UserSdk({
  baseUrl: 'http://localhost:8000',
  httpClient: new FetchAdapter('http://localhost:8000'), // 浏览器端推荐用 FetchAdapter
  autoRefresh: true,
})

// 1. 登录：成功后 token 自动存入内部 TokenManager
const tokens = await sdk.auth.login({ username: 'admin', password: '******' })

// 2. 获取当前登录用户信息
const me = await sdk.users.getMe()

// 3. 登出：自动清除 token
await sdk.auth.logout()
```

---

## 配置 `UserSdkConfig`

```ts
interface UserSdkConfig {
  /** user-service 基础地址，必填 */
  baseUrl: string;
  /** 已有 access token（可选，用于恢复登录态） */
  token?: string;
  /** 已有 refresh token（可选） */
  refreshToken?: string;
  /** 是否开启自动刷新，默认 true */
  autoRefresh?: boolean;
  /** 过期前多少秒触发刷新，默认 60 */
  refreshBufferSeconds?: number;
  /** 请求超时（ms），默认 10000 */
  timeout?: number;
  /** 重试次数，默认 1 —— 预留项，当前未生效，见「已知限制」 */
  maxRetries?: number;
  /** 自定义 logger（默认 NoopLogger） */
  logger?: Logger | null;
  /** 自定义 HTTP 适配器（默认 AxiosAdapter） */
  httpClient?: HttpClient;
}
```

默认值（`DEFAULT_CONFIG`）：

| 配置 | 默认值 | 是否生效 |
| --- | --- | --- |
| `autoRefresh` | `true` | ✅ 生效 |
| `refreshBufferSeconds` | `60` | ✅ 生效 |
| `timeout` | `10000` | ✅ 生效（透传给默认适配器） |
| `maxRetries` | `1` | ❌ 未生效（源码未读取，见[已知限制](#已知限制)） |

各字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `baseUrl` | `string` | ✅ | user-service 基础地址 |
| `token` | `string` | - | 初始 access token；传入后自动写入 TokenManager，用于恢复登录态 |
| `refreshToken` | `string` | - | 初始 refresh token；需与 `token` 同时使用 |
| `autoRefresh` | `boolean` | - | 是否开启自动刷新与 401 重试，默认 `true`，见 [Token 自动刷新机制](#token-自动刷新机制) |
| `refreshBufferSeconds` | `number` | - | token 到期前多少秒视为"临近过期"触发刷新，默认 `60` |
| `timeout` | `number` | - | 请求超时毫秒数，默认 `10000`（仅默认适配器生效） |
| `maxRetries` | `number` | - | ⚠️ 预留配置项，当前版本**未实现通用重试逻辑**。401 重试为写死的单次行为（见[已知限制](#已知限制)） |
| `logger` | `Logger \| null` | - | 自定义日志器（实现 `debug/info/warn/error`），默认 `NoopLogger` |
| `httpClient` | `HttpClient` | - | 自定义 HTTP 适配器，默认 `new AxiosAdapter(baseUrl, timeout)` |

---

## API 参考

### UserSdk 实例方法

构造 `new UserSdk(config)` 后，实例上挂载两个只读服务：

```ts
const sdk = new UserSdk(config)
sdk.auth   // AuthService
sdk.users  // UserService
```

#### `getToken(): string | null`

获取当前 access token（未登录返回 `null`）。

```ts
const token = sdk.getToken()
```

**返回值**：`string | null`。

#### `getRefreshToken(): string | null`

获取当前 refresh token（未登录返回 `null`）。

```ts
const refreshToken = sdk.getRefreshToken()
```

**返回值**：`string | null`。

#### `getTokenPayload(): JwtPayload | null`

解析当前 access token 的 JWT payload（不校验签名，仅解码）。token 缺失 / 格式非法 / 非合法 JWT 时返回 `null`。

```ts
const payload = sdk.getTokenPayload()
// payload: { sub, userId, serviceName, role, type, exp, iat? } | null
```

**返回值**：`JwtPayload | null`。字段已由 snake_case 转为 camelCase（如 `user_id` → `userId`）。

#### `setToken(access: string, refresh?: string): void`

手动设置 token（常用于从 localStorage 恢复登录态）。设置时会同步解析 access token 的 payload。

```ts
sdk.setToken('access-token', 'refresh-token')
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `access` | `string` | ✅ | access token |
| `refresh` | `string` | - | refresh token；不传则保留已有的 refresh token |

#### `clearToken(): void`

清除 access token / refresh token / 已解析的 payload。

```ts
sdk.clearToken()
```

#### `isAuthenticated(): boolean`

判断是否已登录：**access token 存在且未过期**。

- 注意：token 无 `exp` 声明时视为**已过期**（返回 `false`）。

```ts
const authed = sdk.isAuthenticated()
```

**返回值**：`boolean`。

#### `onTokenRefresh(callback: (tokens: TokenPair) => void): () => void`

注册 token 刷新成功后的回调（常用于持久化到 localStorage）。**返回注销函数**，调用后不再触发。

```ts
const unsubscribe = sdk.onTokenRefresh((tokens) => {
  localStorage.setItem('access_token', tokens.accessToken)
  localStorage.setItem('refresh_token', tokens.refreshToken)
})

// 需要时取消订阅：
unsubscribe()
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `callback` | `(tokens: TokenPair) => void` | ✅ | 刷新成功后调用，参数为新的 `TokenPair` |

**返回值**：`() => void`（注销函数）。

#### `close(): void`

清除 token（等价于 `clearToken()`），释放实例。当前实现不涉及其它资源回收。

```ts
sdk.close()
```

---

### AuthService —— `sdk.auth`

#### `login(params: LoginParams): Promise<TokenPair>`

登录（OAuth2 密码模式）。

- **HTTP**：`POST /api/v1/auth/login`
- **请求体**：`application/x-www-form-urlencoded`（`username=...&password=...`，非 JSON）
- **副作用**：成功后 token 自动写入内部 TokenManager

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.username` | `string` | ✅ | 用户名 |
| `params.password` | `string` | ✅ | 密码 |

**返回值**：`TokenPair`（`{ accessToken, refreshToken, tokenType: 'bearer' }`）。

```ts
const tokens = await sdk.auth.login({ username: 'admin', password: 'secret' })
```

**可能抛错**：`AuthError`（用户名密码错误 / 无权限，401/403）、`ValidationError`（422）、`NetworkError`、`HttpError`。

---

#### `register(params: RegisterParams): Promise<TokenPair>`

注册新用户。

- **HTTP**：`POST /api/v1/auth/register`
- **请求体**：JSON，camelCase 字段自动转为 snake_case（`fullName` → `full_name`、`serviceName` → `service_name`）
- **副作用**：成功后 token 自动写入内部 TokenManager（即注册即登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.username` | `string` | ✅ | 用户名 |
| `params.email` | `string` | ✅ | 邮箱 |
| `params.password` | `string` | ✅ | 密码 |
| `params.fullName` | `string` | - | 姓名，映射为 `full_name` |
| `params.serviceName` | `string` | - | 所属服务名，映射为 `service_name` |

**返回值**：`TokenPair`。

```ts
const tokens = await sdk.auth.register({
  username: 'new_user',
  email: 'new@example.com',
  password: 'secret',
  fullName: 'New User',
  serviceName: 'forum',
})
```

**可能抛错**：`ConflictError`（用户名 / 邮箱已存在，409）、`ValidationError`（422）、`AuthError`、`NetworkError`、`HttpError`。

---

#### `refresh(refreshToken?: string): Promise<TokenPair>`

刷新 token。

- **HTTP**：`POST /api/v1/auth/refresh`，JSON 请求体 `{ refresh_token: <token> }`
- **注意**：本方法使用**底层裸 HTTP 适配器**（不经过 AuthInterceptor，避免递归刷新），刷新成功后 token 自动写入 TokenManager
- **一般无需手动调用**：开启 `autoRefresh` 时由拦截器自动触发

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `refreshToken` | `string` | - | 显式指定 refresh token；不传则使用内部 TokenManager 中的 refresh token |

**返回值**：`TokenPair`。

```ts
const tokens = await sdk.auth.refresh() // 使用内部 refresh token
const tokens2 = await sdk.auth.refresh('some-refresh-token')
```

**可能抛错**：

- ⚠️ 内部**没有 refresh token 且未传参**时，抛**原生 `Error`**（消息 `No refresh token available`），**不是 `SdkError`**；
- `AuthError`（refresh token 无效 / 过期，401/403）、`NetworkError`、`HttpError`。

---

#### `logout(): Promise<void>`

登出。

- **HTTP**：`POST /api/v1/auth/logout`
- **副作用**：无论请求成功还是失败（`finally` 块），**必定清除本地 token**

```ts
await sdk.auth.logout() // 即使网络失败，本地 token 也会被清空
```

**返回值**：`Promise<void>`。

**可能抛错**：`AuthError`、`HttpError`、`NetworkError`（请求失败会抛，但 token 已被清除）。

---

### UserService —— `sdk.users`

#### `getMe(): Promise<UserInfo>`

获取当前登录用户信息。

- **HTTP**：`GET /api/v1/users/me`

**返回值**：`UserInfo`。

```ts
const me = await sdk.users.getMe()
```

**可能抛错**：`AuthError`（未登录 / token 失效，401/403）、`NetworkError`、`HttpError`。

---

#### `updateMe(params: UpdateUserParams): Promise<UserInfo>`

更新当前用户信息。

- **HTTP**：`PUT /api/v1/users/me`，JSON 请求体（camelCase → snake_case）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.fullName` | `string` | - | 姓名，映射为 `full_name` |
| `params.serviceName` | `string` | - | 所属服务名，映射为 `service_name` |

**返回值**：`UserInfo`（更新后）。

```ts
const me = await sdk.users.updateMe({ fullName: 'New Name' })
```

**可能抛错**：`AuthError`、`ValidationError`（422）、`ConflictError`（409）、`NetworkError`、`HttpError`。

---

#### `changePassword(params: ChangePasswordParams): Promise<void>`

修改当前用户密码。

- **HTTP**：`POST /api/v1/users/me/change-password`，JSON 请求体

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.oldPassword` | `string` | ✅ | 原密码，映射为 `old_password` |
| `params.newPassword` | `string` | ✅ | 新密码，映射为 `new_password` |

**返回值**：`Promise<void>`。

```ts
await sdk.users.changePassword({ oldPassword: 'old', newPassword: 'new' })
```

**可能抛错**：`AuthError`（原密码错误，401/403）、`ValidationError`（新密码不符合规则，422）、`NetworkError`、`HttpError`。

---

#### `deleteMe(): Promise<void>`

注销当前账号。

- **HTTP**：`DELETE /api/v1/users/me`

**返回值**：`Promise<void>`。

```ts
await sdk.users.deleteMe()
```

**可能抛错**：`AuthError`、`NetworkError`、`HttpError`。

---

#### `getById(id: number): Promise<UserInfo>`

按 ID 获取用户信息。

- **HTTP**：`GET /api/v1/users/:id`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `number` | ✅ | 用户 ID（拼入 URL 路径） |

**返回值**：`UserInfo`。

```ts
const user = await sdk.users.getById(42)
```

**可能抛错**：`NotFoundError`（用户不存在，404）、`AuthError`（可能需更高权限）、`NetworkError`、`HttpError`。

---

#### `list(params?: ListUsersParams): Promise<PaginatedResponse<UserInfo>>`

分页获取用户列表。

- **HTTP**：`GET /api/v1/users`
- **分页契约**：`page` / `pageSize` 转换为 `skip` / `limit`（`skip = (page - 1) * pageSize`，`limit = pageSize`，默认 `page = 1`、`pageSize = 20`）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.serviceName` | `string` | - | 按服务名过滤，映射为 `service_name` |
| `params.page` | `number` | - | 页码，从 1 开始，默认 1 |
| `params.pageSize` | `number` | - | 每页条数，默认 20 |

**返回值**：`PaginatedResponse<UserInfo>`，即 `{ total: number; items: UserInfo[] }`。

```ts
const { total, items } = await sdk.users.list({ serviceName: 'forum', page: 1, pageSize: 20 })
```

**可能抛错**：`AuthError`（可能需 superuser）、`NetworkError`、`HttpError`。

---

## Token 自动刷新机制

整体流程（由 `AuthInterceptor` + `TokenManager` 实现）：

1. **请求前自动刷新**：每次请求前，`AuthInterceptor` 调用 `refreshIfNeeded()`：
   - 无 access token → 不刷新，直接放行（不带 Authorization 头）；
   - token 已过期，或距过期不足 `refreshBufferSeconds`（默认 60）秒 → 调用 `refresh()` 换取新 token，成功后触发所有 `onTokenRefresh` 回调；
   - **token 无 `exp` 声明** → 视为已过期，每次请求前都会尝试刷新；
   - 未临近过期 → 不刷新。
2. **401 自动重试**：请求返回 `401` 且 `autoRefresh` 开启时，**强制刷新一次** token 并用新 token **重放原请求**；每个请求最多重试一次（通过请求 ID 去重，不会无限循环）。
   - 重放后仍失败：按状态码映射错误；
   - 刷新过程抛错：抛 `AuthError('Token refresh failed')`。
3. **并发去重**：刷新过程中的并发请求共享同一个 in-flight Promise，避免同一时刻重复刷新。
4. **持久化**：通过 `onTokenRefresh` 把最新 token 写回 localStorage，刷新页面后可恢复登录态：

```ts
const unsubscribe = sdk.onTokenRefresh((tokens) => {
  localStorage.setItem('access_token', tokens.accessToken)
  localStorage.setItem('refresh_token', tokens.refreshToken)
})
// 需要时：unsubscribe()
```

5. **JWT payload**：`getTokenPayload()` 返回解码后的 payload（字段已由 snake_case 转为 camelCase）。

---

## 类型定义

```ts
// TokenPair
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
}

// JWT payload
export interface JwtPayload {
  sub: string;
  userId: number;
  serviceName: string;
  role: string;            // 如 'superuser' / 'user'
  type: 'access' | 'refresh';
  exp: number;
  iat?: number;
}

// 用户信息
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  serviceName: string;
  role: string;
  createdAt: string;
  updatedAt: string | null;
}

// 登录 / 注册参数
export interface LoginParams {
  username: string;
  password: string;
}
export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  fullName?: string;   // → full_name
  serviceName?: string; // → service_name
}

// 修改密码
export interface ChangePasswordParams {
  oldPassword: string;  // → old_password
  newPassword: string;  // → new_password
}

// 刷新（预留类型，refresh() 直接收 refreshToken?: string）
export interface RefreshTokenParams {
  refreshToken?: string;
}

// 更新 / 列表
export interface UpdateUserParams {
  fullName?: string;     // → full_name
  serviceName?: string;  // → service_name
}
export interface ListUsersParams extends PaginationParams {
  serviceName?: string;  // → service_name
}

// 分页
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}
```

> 响应字段自动做 snake_case ↔ camelCase 转换（递归），SDK 内统一使用 camelCase（例如 `full_name` → `fullName`、`user_id` → `userId`）。

### `decodeJwtPayload(token: string): JwtPayload | null`

独立工具函数：解码任意 JWT 的 payload（不校验签名）。

- 按 `.` 拆分为三段，非三段返回 `null`；
- base64url 解码（浏览器用 `atob` + `TextDecoder`，Node 用 `Buffer`）；
- JSON 解析后递归做 snake_case → camelCase 转换；
- 任何一步失败（非法 token / 非法 JSON）返回 `null`。

```ts
import { decodeJwtPayload } from '@/sdk/user-sdk'

const payload = decodeJwtPayload('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxfQ.signature')
```

---

## 错误处理

错误体系（所有错误继承自 `SdkError`，`SdkError` 继承 `Error`）：

### `SdkError` 公共属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `message` | `string` | 错误消息 |
| `code` | `string` | 错误码（见下表） |
| `statusCode?` | `number` | HTTP 状态码（网络层错误无此字段） |
| `response?` | `unknown` | 后端原始响应体 |
| `cause?` | `Error` | 底层原因（如网络异常） |

### 错误类与触发场景

| 错误类 | code | 触发场景 |
| --- | --- | --- |
| `SdkError` | `SDK_ERROR` | 基类 |
| `AuthError` | `AUTH_ERROR` | 401 / 403，或刷新失败（`Token refresh failed`） |
| `ValidationError` | `VALIDATION_ERROR` | 422，附带 `fields: Record<string, string[]>` 字段级错误 |
| `NotFoundError` | `NOT_FOUND` | 404 |
| `ConflictError` | `CONFLICT` | 409 |
| `HttpError` | `HTTP_ERROR` | 其它 4xx / 5xx |
| `NetworkError` | `NETWORK_ERROR` | 网络不可达 / 超时 |

### 状态码 → 错误类映射（`mapHttpError`）

| 状态码 | 错误类 | 消息来源 |
| --- | --- | --- |
| 401 / 403 | `AuthError` | 优先取后端 `detail` 字段，否则 `Authentication failed` |
| 404 | `NotFoundError` | `Resource not found` |
| 409 | `ConflictError` | `Resource conflict` |
| 422 | `ValidationError` | 从响应 `detail` 数组（`{loc, msg}` 结构）提取 `fields` |
| 其它 ≥ 400 | `HttpError` | `HTTP <status>` |

> ⚠️ 唯一例外：`sdk.auth.refresh()` 在**无 refresh token 可用**时抛**原生 `Error`**（`No refresh token available`），不属于 `SdkError` 体系，捕获时需单独处理。

```ts
import { AuthError, ValidationError, NotFoundError, ConflictError, NetworkError } from '@/sdk'

try {
  await sdk.auth.login({ username, password })
} catch (err) {
  if (err instanceof AuthError) {
    // 认证失败 / 无权限
  } else if (err instanceof ValidationError) {
    // 字段校验失败，err.fields 为 { 字段名: [错误信息] }
  } else if (err instanceof NetworkError) {
    // 网络问题
  }
}
```

---

## HTTP 适配器

所有适配器实现同一接口：

```ts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface HttpRequestConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;   // 查询参数
  data?: unknown;                     // 请求体
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
}

export interface HttpClient {
  request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
}
```

| 适配器 | 说明 |
| --- | --- |
| `FetchAdapter` | 基于原生 `fetch`，**浏览器端推荐**（无需引入 axios） |
| `AxiosAdapter` | 基于 axios，Node / 已引入 axios 的环境使用（默认） |

### `FetchAdapter`

```ts
new FetchAdapter(baseUrl: string, timeout?: number) // 默认 timeout = 10000
```

- **baseUrl 尾斜杠会被去除**；
- 查询参数中值为 `null` / `undefined` 的键跳过；
- 请求体：`URLSearchParams` → `application/x-www-form-urlencoded`；`string` → 原样；其它 → JSON；
- 响应解析：空响应体 → `undefined`；`Content-Type: application/json` → `JSON.parse`（失败回退文本）；其它 → 文本；
- 超时 → `NetworkError('Request timeout')`；其它网络失败 → `NetworkError`。

### `AxiosAdapter`

```ts
new AxiosAdapter(baseUrl: string, timeout?: number) // 默认 timeout = 10000
```

- 内部 `axios.create({ baseURL, timeout, headers: { 'Content-Type': 'application/json' } })`；
- 4xx/5xx 响应不抛出，原样返回（由拦截器统一映射错误）；
- 仅无响应（网络不可达等）时抛 `NetworkError`。

---

## 浏览器端使用示例

```ts
import { UserSdk, FetchAdapter, MetaSdk } from '@/sdk'

// 1. 初始化 user-sdk（fetch 适配器 + 持久化）
const userSdk = new UserSdk({
  baseUrl: 'http://localhost:8000',
  httpClient: new FetchAdapter('http://localhost:8000'),
})

// 恢复登录态
const saved = localStorage.getItem('access_token')
if (saved) userSdk.setToken(saved, localStorage.getItem('refresh_token') ?? undefined)
userSdk.onTokenRefresh((t) => {
  localStorage.setItem('access_token', t.accessToken)
  localStorage.setItem('refresh_token', t.refreshToken)
})

// 2. 校验 superuser 权限（可据此做路由守卫）
const payload = userSdk.getTokenPayload()
if (payload?.role !== 'superuser') {
  userSdk.clearToken()
  // 跳转登录页
}

// 3. 把 token 提供给 meta-sdk
const metaSdk = new MetaSdk({
  baseUrl: 'http://localhost:9093',
  tokenProvider: () => userSdk.getToken(),
})
```

### 项目内单例工厂

`src/sdk/index.ts` 提供 `createUserSdk()`：

```ts
import { createUserSdk, getUserSdk, resetSdkInstances } from '@/sdk'

const userSdk = createUserSdk({
  // 可选：覆盖默认配置
  // baseUrl 默认取环境变量 VITE_USER_SERVICE_URL
})
const same = getUserSdk() // 单例复用

// 重置单例（例如登出/切换账号时）
resetSdkInstances()
```

- 默认从 `VITE_USER_SERVICE_URL` 读取 baseUrl，使用 `FetchAdapter`，`autoRefresh: true`；
- `createMetaSdk()` 内部会自动调用 `createUserSdk()`，并以 `userSdk.getToken()` 作为 meta-sdk 的 `tokenProvider`。

---

## 已知限制

| 限制 | 说明 |
| --- | --- |
| `maxRetries` 未生效 | 配置项存在且默认值为 `1`，但源码未读取该字段，不提供通用重试能力。**401 重试为写死的单次行为**（每个请求最多重放一次），不可配置次数 |
| `refresh()` 无 token 抛原生 Error | 内部无 refresh token 且未传参时抛 `Error('No refresh token available')`，不是 `SdkError`，捕获时需单独处理 |
| `close()` 仅清 token | 等价于 `clearToken()`，不涉及其它资源回收 |
| 无 `exp` 的 token 视为过期 | `isAuthenticated()` 返回 `false`，且开启 `autoRefresh` 时每次请求前都会尝试刷新 |

---

## 目录结构

```
src/sdk/user-sdk/
├── index.ts                 # 入口导出
├── client.ts                # UserSdk 主类
├── config.ts                # UserSdkConfig / DEFAULT_CONFIG
├── auth/
│   ├── token-manager.ts     # TokenManager：token 存储 / 过期判断 / 刷新去重
│   └── auth-interceptor.ts  # AuthInterceptor：注入 Authorization、自动刷新、401 重试
├── services/
│   ├── auth-service.ts      # AuthService：login / register / refresh / logout
│   └── user-service.ts      # UserService：getMe / updateMe / changePassword / deleteMe / getById / list
├── types/
│   ├── auth.ts              # LoginParams / RegisterParams / ChangePasswordParams / RefreshTokenParams
│   ├── user.ts              # UserInfo / UpdateUserParams / ListUsersParams
│   ├── common.ts            # TokenPair / JwtPayload / PaginationParams / PaginatedResponse
│   └── index.ts
├── errors/                  # 错误类 + mapHttpError
├── http/
│   ├── http-client.ts       # HttpClient 接口 / HttpRequestConfig / HttpResponse / HttpMethod
│   ├── axios-adapter.ts     # AxiosAdapter（默认）
│   └── fetch-adapter.ts     # FetchAdapter（浏览器端推荐）
└── utils/
    ├── case-convert.ts      # snakeToCamel / camelToSnake（递归）
    ├── jwt.ts               # decodeJwtPayload（base64url 解码 + camelCase 转换）
    └── logger.ts            # Logger 接口 / NoopLogger / createLogger
```
