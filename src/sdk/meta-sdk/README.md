# meta-sdk

`meta-sdk` 是 **meta-service** 的 TypeScript 客户端 SDK，提供**元数据类型（MetadataType）**与**元数据实体（MetadataEntry）**的管理能力，支持类型 Schema 的创建 / 查询 / 更新 / 删除，以及实体的增删改查、版本历史与回滚。认证通过 `token` 或 `tokenProvider` 接入，与 `user-sdk` 无缝组合。

> 源码位置：`src/sdk/meta-sdk/`（由 meta-service 官方 SDK 源码复制而来，可直接引用）
> 入口导出：`src/sdk/meta-sdk/index.ts`；也可通过总入口 `src/sdk/index.ts` 引用（见 [导入方式](#导入方式)）

---

## 目录

- [导入方式](#导入方式)
- [快速开始](#快速开始)
- [配置 `MetaSdkConfig`](#配置-metasdkconfig)
- [API 参考](#api-参考)
  - [MetaSdk 实例方法](#metasdk-实例方法)
  - [TypeService —— `sdk.types`](#typeservice--sdktypes)
  - [EntryService —— `sdk.entries`](#entryservice--sdkentries)
- [类型定义](#类型定义)
- [错误处理](#错误处理)
- [HTTP 适配器](#http-适配器)
- [认证细节](#认证细节)
- [已知限制](#已知限制)
- [与 user-sdk 组合示例](#与-user-sdk-组合示例)
- [目录结构](#目录结构)

---

## 导入方式

| 来源 | 可导入内容 |
| --- | --- |
| `@/sdk`（总入口） | `MetaSdk`、`MetaSdkConfig`、全部 meta 类型、错误类、`FetchAdapter`、`Logger` |
| `@/sdk/meta-sdk`（本包入口） | 上述全部，外加 `AxiosAdapter` |

> **注意**：`AxiosAdapter` 未从总入口 `@/sdk` 导出，需要时请从 `@/sdk/meta-sdk`（或 `@/sdk/user-sdk`）导入：
>
> ```ts
> import { MetaSdk, AxiosAdapter } from '@/sdk/meta-sdk'
> ```
>
> 项目内同时提供单例工厂 `createMetaSdk()`，见 [与 user-sdk 组合示例](#与-user-sdk-组合示例)。

---

## 快速开始

```ts
import { MetaSdk, FetchAdapter } from '@/sdk'

const sdk = new MetaSdk({
  baseUrl: 'http://localhost:9093',
  httpClient: new FetchAdapter('http://localhost:9093'), // 浏览器端推荐
  token: '已有 access token', // 或使用 tokenProvider 动态获取
})

// 1. 创建元数据类型（含复合字段示例）
const type = await sdk.types.create({
  typeName: 'forum_post',
  serviceName: 'forum',
  description: '论坛帖子',
  schemaJson: {
    fields: {
      title: { type: 'string', required: true },
      view_count: { type: 'integer', default: 0 },
      tags: { type: 'list', items: { type: 'string' } },
      meta: { type: 'dict', values: { type: 'string' } },
      author: {
        type: 'object',
        fields: {
          id: { type: 'integer' },
          name: { type: 'string' },
        },
      },
    },
  },
})

// 2. 创建实体
const entry = await sdk.entries.create({
  typeName: 'forum_post',
  entityKey: 'post-001',
  data: {
    title: 'Hello',
    view_count: 10,
    tags: ['tech'],
    meta: { from: 'web' },
    author: { id: 1, name: 'Alice' },
  },
  tags: ['hot'],
})
```

---

## 配置 `MetaSdkConfig`

```ts
interface MetaSdkConfig {
  /** meta-service 基础地址，必填 */
  baseUrl: string;
  /** 静态 access token（与 tokenProvider 二选一） */
  token?: string;
  /** 动态 token 提供器：每次请求前调用，返回 string | null | Promise<string|null> */
  tokenProvider?: () => string | null | Promise<string | null>;
  /** 请求超时（ms），默认 10000 */
  timeout?: number;
  /** 重试次数，默认 1 —— 预留项，当前未生效，见「已知限制」 */
  maxRetries?: number;
  /** 自定义 logger（默认 NoopLogger，不输出任何内容） */
  logger?: Logger | null;
  /** 自定义 HTTP 适配器（默认 AxiosAdapter，见「HTTP 适配器」） */
  httpClient?: HttpClient;
}
```

默认值（`DEFAULT_CONFIG`）：

| 配置 | 默认值 | 是否生效 |
| --- | --- | --- |
| `timeout` | `10000` | ✅ 生效（透传给 HTTP 适配器） |
| `maxRetries` | `1` | ❌ 未生效（源码未读取，见[已知限制](#已知限制)） |

各字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `baseUrl` | `string` | ✅ | meta-service 基础地址，会与请求路径拼接（如 `http://localhost:9093`） |
| `token` | `string` | - | 静态 access token；每个请求自动附带 `Authorization: Bearer <token>`。与 `tokenProvider` 同时存在时**优先用 `tokenProvider` 的返回值** |
| `tokenProvider` | `() => string \| null \| Promise<string \| null>` | - | 动态取 token；**每次请求前都会调用**。若函数抛错，SDK 会记日志并当作返回 `null`（不向上抛），请求则以未带 token 发出 |
| `timeout` | `number` | - | 请求超时毫秒数，默认 `10000`。仅当 `httpClient` 未自定义时透传给默认适配器 |
| `maxRetries` | `number` | - | ⚠️ 预留配置项，当前版本**未实现重试逻辑**，传了也不起作用 |
| `logger` | `Logger \| null` | - | 自定义日志器（需实现 `debug/info/warn/error`），默认 `NoopLogger` |
| `httpClient` | `HttpClient` | - | 自定义 HTTP 适配器，默认 `new AxiosAdapter(baseUrl, timeout)`。自定义后可完全接管请求发送 |

---

## API 参考

### MetaSdk 实例方法

构造 `new MetaSdk(config)` 后，实例上挂载两个只读服务：

```ts
const sdk = new MetaSdk(config)
sdk.types    // TypeService
sdk.entries  // EntryService
```

#### `setToken(token: string): void`

设置静态 access token。此后所有请求都会携带 `Authorization: Bearer <token>`（除非设置了 `tokenProvider`）。

```ts
sdk.setToken('new-access-token')
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `token` | `string` | 新的 access token |

#### `setTokenProvider(fn: () => string | null | Promise<string | null>): void`

设置（或替换）动态 token 提供器。设置后**优先于静态 token**，每次请求前调用。

```ts
sdk.setTokenProvider(() => userSdk.getToken())
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `fn` | `() => string \| null \| Promise<string \| null>` | token 提供函数；返回 `null` 表示不携带 token |

#### `clearToken(): void`

清除当前 token（静态 token 与 tokenProvider 引用一并清空），后续请求不再携带 `Authorization` 头。

```ts
sdk.clearToken()
```

#### `close(): void`

清除 token，释放实例。**当前实现等价于 `clearToken()`**（源码仅执行 `setToken(null)`），不涉及连接池等资源回收。

```ts
sdk.close()
```

---

### TypeService —— `sdk.types`

> 以下权限列来自后端 meta-service 契约（superuser 为后端角色）。

#### `create(params: CreateTypeParams): Promise<MetadataType>`

创建元数据类型。

- **HTTP**：`POST /api/v1/types`，请求体为 camelCase → snake_case 转换后的 JSON
- **权限**：superuser

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.typeName` | `string` | ✅ | 类型名（后端唯一约束） |
| `params.serviceName` | `string` | ✅ | 所属服务名 |
| `params.description` | `string` | - | 类型描述 |
| `params.schemaJson` | `SchemaDefinition` | ✅ | 字段 Schema，`{ fields: Record<string, FieldDefinition> }`，见[字段类型预设](#类型定义) |

**返回值**：`MetadataType`（已创建的类型）。

```ts
const type = await sdk.types.create({
  typeName: 'forum_post',
  serviceName: 'forum',
  description: '论坛帖子',
  schemaJson: { fields: { title: { type: 'string', required: true } } },
})
```

**可能抛错**：`AuthError`（401/403）、`ConflictError`（类型名已存在，409）、`ValidationError`（Schema 非法，422）、`HttpError`、`NetworkError`。

---

#### `list(params?: { serviceName?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<MetadataType>>`

分页获取类型列表。

- **HTTP**：`GET /api/v1/types`
- **分页契约**：`page` / `pageSize` 转换为 `skip` / `limit`（`skip = (page - 1) * pageSize`，`limit = pageSize`，默认 `page = 1`、`pageSize = 20`）
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.serviceName` | `string` | - | 按服务名过滤，映射为 `service_name` 查询参数 |
| `params.page` | `number` | - | 页码，从 1 开始，默认 1 |
| `params.pageSize` | `number` | - | 每页条数，默认 20 |

**返回值**：`PaginatedResponse<MetadataType>`，即 `{ total: number; items: MetadataType[] }`。

```ts
const { total, items } = await sdk.types.list({ serviceName: 'forum', page: 1, pageSize: 20 })
```

**可能抛错**：`AuthError`、`HttpError`、`NetworkError`。

---

#### `get(typeName: string, serviceName?: string): Promise<MetadataType>`

获取单个类型详情（含完整 `schemaJson`）。

- **HTTP**：`GET /api/v1/types/:typeName`
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名（拼入 URL 路径） |
| `serviceName` | `string` | - | 所属服务名，映射为 `service_name` 查询参数；不传时由后端按当前用户所属服务定位 |

**返回值**：`MetadataType`。

```ts
const type = await sdk.types.get('forum_post', 'forum')
```

**可能抛错**：`NotFoundError`（类型不存在，404）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `update(typeName: string, serviceName: string, params: UpdateTypeParams): Promise<MetadataType>`

更新类型描述 / 字段。

- **HTTP**：`PUT /api/v1/types/:typeName`，请求体为 camelCase → snake_case 转换后的 JSON
- **权限**：superuser
- **后端约束**：**类型下无实体数据时允许移除字段；存在实体数据时仅允许新增字段**（含新增复合子定义），不允许修改已有字段 / 子定义类型

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名（拼入 URL 路径） |
| `serviceName` | `string` | ✅ | 所属服务名，映射为 `service_name` 查询参数 |
| `params.description` | `string` | - | 新的类型描述 |
| `params.schemaJson` | `SchemaDefinition` | - | 新的完整 Schema；类型下无实体数据时可移除已有字段，否则需在旧 Schema 基础上**追加**新字段，不能删除已有字段 |

**返回值**：`MetadataType`（更新后的类型）。

```ts
// 在已有字段基础上追加新字段
const type = await sdk.types.update('forum_post', 'forum', {
  description: '新描述',
  schemaJson: { fields: { ...oldType.schemaJson.fields, new_field: { type: 'string' } } },
})
```

**可能抛错**：`NotFoundError`（404）、`ConflictError`（试图修改 / 删除已有字段，409）、`ValidationError`（422）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `delete(typeName: string, serviceName?: string): Promise<void>`

删除元数据类型。

- **HTTP**：`DELETE /api/v1/types/:typeName`
- **权限**：superuser
- **后端约束**：**该类型下仍有实体数据时后端返回 409 拒绝**（抛 `ConflictError`）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名（拼入 URL 路径） |
| `serviceName` | `string` | - | 所属服务名，映射为 `service_name` 查询参数 |

**返回值**：`Promise<void>`（无响应体，如 204）。

```ts
await sdk.types.delete('forum_post', 'forum')
```

**可能抛错**：`ConflictError`（类型下仍有实体，409）、`NotFoundError`（404）、`AuthError`、`HttpError`、`NetworkError`。

---

### EntryService —— `sdk.entries`

#### `create(params: CreateEntryParams): Promise<MetadataEntry>`

创建元数据实体。

- **HTTP**：`POST /api/v1/entries`，请求体为 camelCase → snake_case 转换后的 JSON
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.typeName` | `string` | ✅ | 实体所属类型名 |
| `params.entityKey` | `string` | ✅ | 实体业务主键，同一类型下唯一 |
| `params.data` | `Record<string, unknown>` | ✅ | 实体数据（字段需符合类型 Schema） |
| `params.tags` | `string[]` | - | 标签列表 |
| `params.serviceName` | `string` | - | 类型所属服务名。**跨 service 操作时必须显式传入**，否则后端按当前用户所属 service 定位（映射为 `service_name`） |

**返回值**：`MetadataEntry`（含服务端生成的 `id`、`version`、`createdAt` 等）。

```ts
const entry = await sdk.entries.create({
  typeName: 'forum_post',
  entityKey: 'post-001',
  data: { title: 'Hello', view_count: 10 },
  tags: ['hot'],
})
```

**可能抛错**：`ConflictError`（同类型下 entityKey 已存在，409）、`ValidationError`（数据不符合 Schema，422）、`NotFoundError`（类型不存在，404）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `get(typeName: string, entityKey: string, options?: GetEntryOptions): Promise<MetadataEntry>`

获取单个实体，可指定历史版本。

- **HTTP**：`GET /api/v1/entries/:typeName/:entityKey`
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名 |
| `entityKey` | `string` | ✅ | 实体 key |
| `options.version` | `number` | - | 指定历史版本号；不传返回当前最新版本（映射为 `version` 查询参数） |

**返回值**：`MetadataEntry`。

```ts
const latest = await sdk.entries.get('forum_post', 'post-001')
const v2 = await sdk.entries.get('forum_post', 'post-001', { version: 2 })
```

**可能抛错**：`NotFoundError`（实体或指定版本不存在，404）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `batchGet(params: BatchQueryEntriesParams): Promise<BatchQueryEntriesResult>`

按 `entityKey` 列表一次取回多个实体。

- **HTTP**：`POST /api/v1/entries/batch`，请求体 `{ type_name, keys[], service_name? }`
- **权限**：登录即可；`serviceName` 指定其他服务时需 superuser

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.typeName` | `string` | ✅ | 类型名 |
| `params.keys` | `string[]` | ✅ | 待查询的 entity_key 列表。服务端会去重；**数量上限 200**，超限返回 422 |
| `params.serviceName` | `string` | - | 目标业务名（仅 superuser 可指定其他服务，默认当前用户所属服务） |

**返回值**：`BatchQueryEntriesResult`，即 `Record<string, MetadataEntry | null>`：

- key 存在且可访问 → `MetadataEntry`；
- 未找到 / 软删 / 无权限 → `null`；
- key 不在返回对象中（如服务端过滤掉）→ 访问得到 `undefined`。

> 实现细节：响应**顶层 key 保持原样（不做大小写转换）**，仅对每个 value 做 snake_case → camelCase 转换。因此返回对象的 key 就是请求时传入的 `entityKey`。

```ts
const map = await sdk.entries.batchGet({
  typeName: 'forum_post',
  keys: ['post-001', 'post-002', 'post-missing'],
})

map['post-001']      // MetadataEntry | null | undefined
map['post-missing']  // null（后端明确返回 null）
```

**可能抛错**：`ValidationError`（keys 超 200 或格式非法，422）、`NotFoundError`（类型不存在，404）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `update(typeName: string, entityKey: string, params: UpdateEntryParams): Promise<MetadataEntry>`

更新实体。

- **HTTP**：`PUT /api/v1/entries/:typeName/:entityKey`，请求体为 camelCase → snake_case 转换后的 JSON
- **后端契约**：`data` / `tags` 采用 **deep merge** 合并（不整体覆盖），成功后版本自增
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名 |
| `entityKey` | `string` | ✅ | 实体 key |
| `params.data` | `Record<string, unknown>` | - | 要合并进 `data` 的字段（deep merge，不传则不修改 data） |
| `params.tags` | `string[]` | - | 合并后的完整标签列表（替换式更新） |

**返回值**：`MetadataEntry`（更新后、版本自增后的实体）。

```ts
const updated = await sdk.entries.update('forum_post', 'post-001', {
  data: { view_count: 11 }, // 只改这一个字段，其余字段保留
  tags: ['hot', 'tech'],
})
```

**可能抛错**：`NotFoundError`（404）、`ConflictError`（409）、`ValidationError`（422）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `delete(typeName: string, entityKey: string): Promise<void>`

删除实体。

- **HTTP**：`DELETE /api/v1/entries/:typeName/:entityKey`
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名 |
| `entityKey` | `string` | ✅ | 实体 key |

**返回值**：`Promise<void>`（204 空响应体）。

```ts
await sdk.entries.delete('forum_post', 'post-001')
```

**可能抛错**：`NotFoundError`（404）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `query(params: QueryEntriesParams): Promise<PaginatedResponse<MetadataEntry>>`

复杂查询：字段过滤 + tags 交集 + 排序 + 时间范围。

- **HTTP**：`GET /api/v1/entries`
- **分页契约**：⚠️ 与 `types.list` / `users.list` 不同，这里 `page` / `pageSize` **直接透传**为 `page` / `page_size` 查询参数（后端该接口不接受 `skip` / `limit`，否则会被当作字段过滤器）
- **权限**：登录即可；跨 service 查询需 superuser

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `params.typeName` | `string` | - | 类型名，映射为 `type_name` |
| `params.serviceName` | `string` | - | 业务名，映射为 `service_name`。跨 service 查询需 superuser；不传时 GLOBAL 角色查全部，普通身份强制自身 service |
| `params.filters` | `Record<string, unknown>` | - | 任意字段值键值对，**每个键值平铺为查询参数**（字段名原样透传，不做大小写转换） |
| `params.tags` | `string[]` | - | 标签过滤（**交集**语义），多个 tag 以逗号拼接为 `tags` 参数 |
| `params.sortBy` | `string` | - | 排序字段，映射为 `sort_by` |
| `params.sortOrder` | `'asc' \| 'desc'` | - | 排序方向，映射为 `sort_order` |
| `params.createdAfter` | `string` | - | 创建时间下限（ISO 字符串），映射为 `created_after` |
| `params.createdBefore` | `string` | - | 创建时间上限（ISO 字符串），映射为 `created_before` |
| `params.page` | `number` | - | 页码，透传为 `page` |
| `params.pageSize` | `number` | - | 每页条数，透传为 `page_size` |

**返回值**：`PaginatedResponse<MetadataEntry>`。

```ts
const { total, items } = await sdk.entries.query({
  typeName: 'forum_post',
  filters: { status: 'published' },
  tags: ['hot', 'tech'],       // 交集：同时含 hot 和 tech
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  pageSize: 20,
})
```

**可能抛错**：`AuthError`、`ValidationError`（422）、`HttpError`、`NetworkError`。

---

#### `listVersions(typeName: string, entityKey: string, params?: PaginationParams): Promise<PaginatedResponse<MetadataVersion>>`

获取实体的版本历史。

- **HTTP**：`GET /api/v1/entries/:typeName/:entityKey/versions`
- **分页契约**：⚠️ 同 `query`，`page` / `pageSize` **直接透传**为 `page` / `page_size`，不做 skip/limit 转换
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名 |
| `entityKey` | `string` | ✅ | 实体 key |
| `params.page` | `number` | - | 页码，透传为 `page` |
| `params.pageSize` | `number` | - | 每页条数，透传为 `page_size` |

**返回值**：`PaginatedResponse<MetadataVersion>`，`items` 为按版本排列的历史记录（含完整 `data` / `tags` 快照）。

```ts
const versions = await sdk.entries.listVersions('forum_post', 'post-001', { page: 1, pageSize: 10 })
```

**可能抛错**：`NotFoundError`（404）、`AuthError`、`HttpError`、`NetworkError`。

---

#### `rollback(typeName: string, entityKey: string, params: RollbackParams): Promise<MetadataEntry>`

回滚实体到指定历史版本。

- **HTTP**：`POST /api/v1/entries/:typeName/:entityKey/rollback`，请求体 `{ version }`
- **后端契约**：回滚会**生成一个新版本**（原历史不被覆盖）
- **权限**：登录即可

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `typeName` | `string` | ✅ | 类型名 |
| `entityKey` | `string` | ✅ | 实体 key |
| `params.version` | `number` | ✅ | 要回滚到的版本号 |

**返回值**：`MetadataEntry`（回滚后生成的新版本实体）。

```ts
const rolledBack = await sdk.entries.rollback('forum_post', 'post-001', { version: 3 })
```

**可能抛错**：`NotFoundError`（实体或版本不存在，404）、`ValidationError`（422）、`AuthError`、`HttpError`、`NetworkError`。

---

## 类型定义

### 字段类型预设

`FieldDefinition.type` 支持 7 种预设，其中 `list` / `dict` / `object` 为复合类型（与后端 meta-service schema 对齐）：

| 类型 | 说明 | 附带子定义字段 |
| --- | --- | --- |
| `string` | 字符串 | - |
| `integer` | 整数 | - |
| `number` | 浮点数 | - |
| `boolean` | 布尔 | - |
| `list` | 数组 | `items?: FieldDefinition`（元素类型，可嵌套复合类型） |
| `dict` | 键值映射 | `values?: FieldDefinition`（值类型，可嵌套复合类型） |
| `object` | 结构化嵌套对象 | `fields?: Record<string, FieldDefinition>`（子字段，递归结构） |

```ts
export type FieldType = 'string' | 'integer' | 'number' | 'boolean' | 'list' | 'dict' | 'object';

export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  indexed?: boolean;
  default?: unknown;
  /** list 元素类型定义（可嵌套复合类型） */
  items?: FieldDefinition;
  /** dict 值类型定义（可嵌套复合类型） */
  values?: FieldDefinition;
  /** object 子字段定义（递归结构） */
  fields?: Record<string, FieldDefinition>;
}

export interface SchemaDefinition {
  fields: Record<string, FieldDefinition>;
}
```

**嵌套示例：**

```ts
const schemaJson = {
  fields: {
    // list 的元素也是 list
    matrix: { type: 'list', items: { type: 'list', items: { type: 'number' } } },
    // dict 的值是 object
    profiles: {
      type: 'dict',
      values: {
        type: 'object',
        fields: {
          nickname: { type: 'string' },
          level: { type: 'integer', default: 1 },
        },
      },
    },
    // object 的子字段可继续嵌套
    payload: {
      type: 'object',
      fields: {
        addresses: { type: 'list', items: { type: 'string' } },
      },
    },
  },
}
```

> 更新类型时后端约束：**类型下无实体数据时允许移除字段；存在实体数据时仅允许新增字段**（含新增复合子定义），不允许修改已有字段 / 子定义类型。

### 实体 / 类型 / 版本

```ts
// 元数据类型
export interface MetadataType {
  id: number;
  typeName: string;
  serviceName: string;
  description: string | null;
  schemaJson: SchemaDefinition; // { fields: Record<string, FieldDefinition> }
  createdAt: string;
  updatedAt: string | null;
}

// 元数据实体
export interface MetadataEntry {
  id: number;
  typeName: string;
  entityKey: string;
  data: Record<string, unknown>;
  tags: string[];
  version: number;
  ownerUserId: number;
  serviceName: string;
  createdAt: string;
  updatedAt: string | null;
}

// 版本记录
export interface MetadataVersion {
  version: number;
  data: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  createdByUserId: number;
}
```

### 请求参数

```ts
// 创建 / 更新类型
export interface CreateTypeParams {
  typeName: string;
  serviceName: string;
  description?: string;
  schemaJson: SchemaDefinition;
}
export interface UpdateTypeParams {
  description?: string;
  schemaJson?: SchemaDefinition;
}

// 创建 / 更新实体
export interface CreateEntryParams {
  typeName: string;
  entityKey: string;
  data: Record<string, unknown>;
  tags?: string[];
  /** 类型所属服务名（跨 service 操作时必须显式传入，否则后端按当前用户所属 service 定位） */
  serviceName?: string;
}
export interface UpdateEntryParams {
  data?: Record<string, unknown>;
  tags?: string[];
}

// 读取选项
export interface GetEntryOptions {
  version?: number;
}

// 查询参数
export interface QueryEntriesParams extends PaginationParams {
  typeName?: string;
  /** 业务名（跨 service 查询需 superuser；不传时 GLOBAL 查全部，普通身份强制自身 service） */
  serviceName?: string;
  filters?: Record<string, unknown>;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
}

// 批量查询
export interface BatchQueryEntriesParams {
  /** 类型名（必填） */
  typeName: string;
  /** 待查询的 entity_key 列表（服务端去重；数量上限 200，超限返回 422） */
  keys: string[];
  /** 目标业务名（仅 superuser 可指定其他服务，默认当前用户所属服务） */
  serviceName?: string;
}
/** 批量查询结果：{ entityKey: MetadataEntry | null }；未找到 / 软删 / 无权限的 key 对应 null */
export type BatchQueryEntriesResult = Record<string, MetadataEntry | null>;

// 回滚
export interface RollbackParams {
  version: number;
}

// 分页（common）
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}
```

> 响应字段自动做 snake_case ↔ camelCase 转换（递归），SDK 内统一使用 camelCase。**例外**：`batchGet` 返回对象的顶层 key 不做转换（entity_key 可能含下划线）。

---

## 错误处理

错误体系与 user-sdk 完全一致（均继承自 `SdkError`，`SdkError` 继承自原生 `Error`）：

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
| `AuthError` | `AUTH_ERROR` | 401 / 403（meta-sdk 在客户端直接抛出；401 消息为 `Unauthorized`，403 为 `Forbidden`） |
| `ValidationError` | `VALIDATION_ERROR` | 422，附 `fields?: Record<string, string[]>`（字段级错误，从后端 `detail` 数组解析） |
| `NotFoundError` | `NOT_FOUND` | 404 |
| `ConflictError` | `CONFLICT` | 409（典型：删除有实体数据的类型 / entityKey 已存在） |
| `HttpError` | `HTTP_ERROR` | 其它 4xx / 5xx（消息为 `HTTP <status>`） |
| `NetworkError` | `NETWORK_ERROR` | 网络不可达 / 超时 |

### 状态码 → 错误类映射（`mapHttpError`）

| 状态码 | 错误类 | 消息来源 |
| --- | --- | --- |
| 401 / 403 | `AuthError` | 优先取后端 `detail` 字段，否则 `Authentication failed` |
| 404 | `NotFoundError` | `Resource not found` |
| 409 | `ConflictError` | `Resource conflict` |
| 422 | `ValidationError` | 从响应 `detail` 数组（`{loc, msg}` 结构）提取 `fields` |
| 其它 ≥ 400 | `HttpError` | `HTTP <status>` |

```ts
import { ConflictError, NotFoundError, ValidationError } from '@/sdk'

try {
  await sdk.types.delete('forum_post', 'forum')
} catch (err) {
  if (err instanceof ConflictError) {
    // 该类型下仍有实体数据，删除被拒绝
  } else if (err instanceof NotFoundError) {
    // 类型不存在
  } else if (err instanceof ValidationError) {
    console.log(err.fields) // { fieldName: ['错误信息'] }
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

行为细节：

- **baseUrl 尾斜杠会被去除**（`https://host/` → `https://host`），避免与路径拼接出双斜杠；
- **查询参数**：`params` 中值为 `null` / `undefined` 的键会被跳过；已有 query 时用 `&` 追加；
- **请求体**：
  - `URLSearchParams` 实例 → `application/x-www-form-urlencoded`；
  - `string` → 原样发送（不设 Content-Type）；
  - 其它对象 → `JSON.stringify` + `application/json`；
- **响应解析**：
  - 空响应体（如 `204 No Content`）→ 返回 `undefined`，不会抛 JSON 解析错误；
  - `Content-Type: application/json` → `JSON.parse`，失败时回退为原始文本；
  - 其它类型 → 原样返回文本；
- **错误**：超时（AbortController 触发）→ `NetworkError('Request timeout')`；其它网络失败 → `NetworkError`。

### `AxiosAdapter`

```ts
new AxiosAdapter(baseUrl: string, timeout?: number) // 默认 timeout = 10000
```

行为细节：

- 内部 `axios.create({ baseURL, timeout, headers: { 'Content-Type': 'application/json' } })`；
- **HTTP 错误不抛出**：axios 请求返回 4xx/5xx 时，适配器将响应（状态码 + 数据）原样返回，由上层 `TokenAuthHttpClient` / 各 Service 统一做状态码判断与错误映射；
- 仅在**无响应**（网络不可达等）时抛 `NetworkError`。

---

## 认证细节

`MetaSdk` 内部用 `TokenAuthHttpClient` 包裹底层适配器，流程如下：

1. **取 token**：每次请求前调用 `resolveToken()` —— 有 `tokenProvider` 则调用它（**抛错会被捕获并记日志，当作返回 `null`**），否则用静态 `token`；
2. **注入请求头**：token 非空时设置 `Authorization: Bearer <token>`，为空则不设置；
3. **状态码处理**：
   - `401` → 抛 `AuthError('Unauthorized')`；
   - `403` → 抛 `AuthError('Forbidden')`；
   - 其它 `>= 400` → `mapHttpError(status, data)`。

> ⚠️ **meta-sdk 没有 token 自动刷新能力**（与 user-sdk 不同）。401 会直接抛 `AuthError`，需要自行处理（例如组合 user-sdk 时用 `tokenProvider: () => userSdk.getToken()`，由 user-sdk 的自动刷新保证 meta-sdk 每次拿到的都是新 token）。

---

## 已知限制

| 限制 | 说明 |
| --- | --- |
| `maxRetries` 未生效 | 配置项存在且默认值为 `1`，但源码未读取该字段，请求不会自动重试。需要重试请自行在 `httpClient` 适配器层实现 |
| `close()` 仅清 token | 不涉及连接池 / 定时器等资源回收，当前等价于 `clearToken()` |
| `tokenProvider` 异常被吞 | 提供器抛错时仅记日志并返回 `null`，不会向上抛给调用方；请求将以未携带 token 发出，可能因此得到 401 |

---

## 与 user-sdk 组合示例

```ts
import { UserSdk, MetaSdk, FetchAdapter } from '@/sdk'

const userSdk = new UserSdk({
  baseUrl: 'http://localhost:8000',
  httpClient: new FetchAdapter('http://localhost:8000'),
})
await userSdk.auth.login({ username: 'admin', password: 'secret' })

// 通过 tokenProvider 动态取 token：user-sdk 自动刷新后，meta-sdk 透明感知
const metaSdk = new MetaSdk({
  baseUrl: 'http://localhost:9093',
  httpClient: new FetchAdapter('http://localhost:9093'),
  tokenProvider: () => userSdk.getToken(),
})
```

### 项目内单例工厂

`src/sdk/index.ts` 提供 `createMetaSdk()`，已内置此组合：

```ts
import { createMetaSdk, getMetaSdk, resetSdkInstances } from '@/sdk'

const metaSdk = createMetaSdk({
  // 可选：覆盖默认配置
  // baseUrl 默认取环境变量 VITE_META_SERVICE_URL
})
// 或直接复用已创建实例（单例）
const same = getMetaSdk()

// 重置单例（例如登出/切换账号时）
resetSdkInstances()
```

- 默认从 `VITE_META_SERVICE_URL` / `VITE_USER_SERVICE_URL` 读取地址；
- 自动以 `userSdk.getToken()` 作为 `tokenProvider`（需先调用 `createUserSdk()`，`createMetaSdk()` 内部会自动创建）；
- 相关函数：`createUserSdk()` / `getUserSdk()` / `getMetaSdk()` / `resetSdkInstances()`。

---

## 目录结构

```
src/sdk/meta-sdk/
├── index.ts                 # 入口导出
├── client.ts                # MetaSdk 主类 + TokenAuthHttpClient（注入 Bearer token）
├── config.ts                # MetaSdkConfig / DEFAULT_CONFIG
├── services/
│   ├── type-service.ts      # TypeService：create / list / get / update / delete
│   └── entry-service.ts     # EntryService：create / get / batchGet / update / delete / query / listVersions / rollback
├── types/
│   ├── type.ts              # MetadataType / SchemaDefinition / FieldDefinition / FieldType / CreateTypeParams / UpdateTypeParams
│   ├── entry.ts             # MetadataEntry / MetadataVersion / 实体请求参数
│   ├── common.ts            # PaginationParams / PaginatedResponse
│   └── index.ts
├── errors/                  # 错误类 + mapHttpError
├── http/
│   ├── http-client.ts       # HttpClient 接口 / HttpRequestConfig / HttpResponse / HttpMethod
│   ├── axios-adapter.ts     # AxiosAdapter（默认）
│   └── fetch-adapter.ts     # FetchAdapter（浏览器端推荐）
└── utils/
    ├── case-convert.ts      # snakeToCamel / camelToSnake（递归）
    └── logger.ts            # Logger 接口 / NoopLogger / createLogger
```
