# @hey-api 接入计划

## Context

当前 admin-web 前端使用 axios 进行 API 调用，所有请求和响应均为 `any` 类型，需要手动 `as unknown as Type` 转换。这导致：
- 缺乏类型安全，API 变更时编译期无法发现错误
- 手动维护类型定义容易与后端不一致
- 错误处理模式不统一（try/catch + `err?.response?.data?.message`）

通过接入 `@hey-api/openapi-ts` 从 NestJS 的 OpenAPI spec 自动生成类型安全的 TypeScript SDK，实现：
- 所有 API 调用完全类型化，消除 `as unknown as` 模式
- 请求参数和响应体自动推断类型
- 与后端 Swagger 文档保持同步

## 技术方案

| 决策 | 选项 | 原因 |
|------|------|------|
| 客户端库 | `@hey-api/client-fetch` | 基于 Fetch API，比 axios 更轻量，Next.js 原生支持 |
| 生成代码位置 | `packages/shared/src/generated/` | 共享包，admin-web 和 server 均可引用 |
| Auth 拦截器 | 放在 `apps/admin-web/src/lib/` | 拦截器逻辑是前端专属，不应放入共享包 |
| 操作 ID | 为每个端点添加 `operationId` | 生成可预测的函数名，如 `adminLogin`、`getEnterpriseUsers` |

## 实施步骤

### Step 1: 安装依赖

```bash
# 根目录安装代码生成工具
npm install -D @hey-api/openapi-ts

# admin-web 安装客户端运行时
npm install @hey-api/client-fetch -w apps/admin-web
```

### Step 2: 导出 OpenAPI Spec

在 `apps/server/src/main.ts` 中，Swagger 已配置完成。添加导出逻辑：

```typescript
import * as fs from 'fs';
import * as path from 'path';

// 在 SwaggerModule.createDocument 之后
const outputPath = path.resolve(__dirname, '../../packages/shared/openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
```

将 `packages/shared/openapi.json` 加入 `.gitignore`（生成文件不入库）。

### Step 3: 创建 @hey-api 配置

新建 `openapi-ts.config.ts`（根目录）：

```typescript
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: 'packages/shared/openapi.json',
  output: {
    path: 'packages/shared/src/generated',
    format: 'prettier',
    lint: false,
  },
  services: { asClass: true },
  types: { enums: 'javascript' },
  schemas: false,
});
```

添加根 `package.json` 脚本：
```json
"generate:api": "openapi-ts"
```

### Step 4: 为后端控制器添加 `operationId` 和响应类型

需要修改以下控制器，为每个 `@ApiOperation` 添加 `operationId`，为 `@ApiResponse` 添加 `type`：

**`apps/server/src/modules/admin/admin.controller.ts`**：
- 所有端点添加 `operationId`（如 `adminLogin`, `getMe`, `getAdminOverview`, `getEnterpriseUsers`, `createEnterpriseUser`, `updateEnterpriseUser`, `deleteEnterpriseUser`, `getEnterpriseApps`, `createEnterpriseApp`, `deleteEnterpriseApp`）
- 关键 `@ApiResponse` 添加 `type` 属性

**`apps/server/src/modules/enterprise/enterprise.controller.ts`**：
- 所有端点添加 `operationId`（如 `createEnterprise`, `getEnterprises`, `getEnterpriseById`, `updateEnterprise`, `deleteEnterprise`）
- 关键 `@ApiResponse` 添加 `type` 属性

**`apps/server/src/modules/auth/auth.controller.ts`**：
- 已有 `success()` 包装响应的端点，添加 `operationId`

### Step 5: 生成 SDK

```bash
# 启动后端，导出 OpenAPI spec
npm run dev:server

# 生成 SDK
npm run generate:api
```

生成后 `packages/shared/src/generated/` 将包含：
- `sdk.gen.ts` — 类型安全 SDK 函数
- `types.gen.ts` — 自动生成的 TypeScript 类型
- `index.ts` — 导出汇总

### Step 6: 创建前端客户端包装器

新建 `apps/admin-web/src/lib/hey-api-client.ts`，封装 auth 拦截器：

```typescript
import { client } from '@nestjs-sso/shared/generated';
import Cookies from 'js-cookie';

client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
});

// 请求拦截：注入 Bearer Token
client.interceptors.request.use((request) => {
  const token = Cookies.get('admin_token');
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }
  return request;
});

// 响应拦截：401 自动跳转登录
client.interceptors.response.use((response) => {
  if (response.status === 401 && typeof window !== 'undefined') {
    Cookies.remove('admin_token');
    Cookies.remove('admin_user');
    window.location.href = '/login';
  }
  return response;
});

export { client };
export * from '@nestjs-sso/shared/generated';
```

### Step 7: 迁移 API 调用点

将以下文件中的 axios 调用替换为生成的 SDK 函数：

| 文件 | 当前模式 | 迁移后模式 |
|------|---------|-----------|
| `lib/auth.ts` | `api.post('/admin/login', ...)` | `adminLogin({ body: {...} })` |
| `dashboard/page.tsx` | `api.get('/admin/overview')` | `getAdminOverview()` |
| `dashboard/apps/page.tsx` | `api.get/post/delete('/admin/enterprise/apps')` | `getEnterpriseApps()` / `createEnterpriseApp()` / `deleteEnterpriseApp()` |
| `dashboard/users/page.tsx` | `api.get/post/patch/delete('/admin/enterprise/users')` | `getEnterpriseUsers()` / `createEnterpriseUser()` / `updateEnterpriseUser()` / `deleteEnterpriseUser()` |
| `dashboard/enterprises/page.tsx` | `api.get/post/patch/delete('/enterprises')` | `getEnterprises()` / `createEnterprise()` / `updateEnterprise()` / `deleteEnterprise()` |

**迁移模式示例**：

```typescript
// 之前（axios）
const res = (await api.get('/admin/enterprise/users', { params: { page: 1, pageSize: 20 } })) as unknown as PaginatedResponse<User>;

// 之后（@hey-api）
const { data, error } = await getEnterpriseUsers({ query: { page: 1, pageSize: 20 } });
if (error) { toast.error(error.message); return; }
// data 自动推断类型
```

错误处理从 try/catch 改为 `{ data, error }` 解构模式。

### Step 8: 清理

- 删除 `apps/admin-web/src/lib/api.ts`
- 移除 axios 依赖：`npm uninstall axios -w apps/admin-web`

### Step 9: 验证

1. 向后端所有控制器添加 `type` 属性后，重新导出 spec 并生成 SDK
2. `npm run build:shared` — 共享包编译通过
3. `npm run build:admin` — 前端编译通过，无类型错误
4. 启动服务，手动测试所有 CRUD 操作：登录、概览、用户管理、应用管理、企业管理
5. 验证 401 自动跳转登录页功能正常

## 涉及文件

### 新建
- `openapi-ts.config.ts` — hey-api 代码生成配置
- `apps/admin-web/src/lib/hey-api-client.ts` — 带 auth 拦截器的客户端包装器

### 修改
- `apps/server/src/main.ts` — 添加 OpenAPI spec 导出
- `apps/server/src/modules/admin/admin.controller.ts` — 添加 operationId + response type
- `apps/server/src/modules/enterprise/enterprise.controller.ts` — 添加 operationId + response type
- `apps/server/src/modules/auth/auth.controller.ts` — 添加 operationId
- `apps/admin-web/src/lib/auth.ts` — 迁移到生成的 SDK
- `apps/admin-web/src/app/dashboard/page.tsx` — 迁移到生成的 SDK
- `apps/admin-web/src/app/dashboard/apps/page.tsx` — 迁移到生成的 SDK
- `apps/admin-web/src/app/dashboard/users/page.tsx` — 迁移到生成的 SDK
- `apps/admin-web/src/app/dashboard/enterprises/page.tsx` — 迁移到生成的 SDK
- `apps/admin-web/package.json` — 添加 @hey-api/client-fetch，移除 axios
- `package.json`（根） — 添加 generate:api 脚本，添加 @hey-api/openapi-ts devDependency
- `.gitignore` — 添加 openapi.json

### 删除
- `apps/admin-web/src/lib/api.ts`