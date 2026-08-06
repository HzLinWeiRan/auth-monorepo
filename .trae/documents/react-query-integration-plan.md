# @tanstack/react-query 集成方案

## Context

当前 admin-web 使用手动 `useState` + `useEffect` 管理数据获取，存在以下问题：
- 每个页面重复编写 loading/error/data 状态管理逻辑
- 数据没有缓存，页面切换后重新请求
- 分页切换时出现空白闪烁
- 变更操作后需手动调用 `loadData()` 刷新

通过集成 `@tanstack/react-query` v5，实现声明式数据获取、自动缓存、乐观更新、分页保持和统一的变更后刷新。

## 架构决策

| 决策 | 方案 | 原因 |
|------|------|------|
| Hooks 位置 | `src/hooks/` 集中管理 | 多页面共享同一 API（如 Overview 和 Users 页都用 `getEnterpriseUsers`） |
| Query Key 约定 | `['admin', 'resource', params]` | 层级结构支持批量失效（`['admin', 'users']` 失效所有分页） |
| API 适配 | `unwrapResult()` 包装 `{ data, error }` | @hey-api 返回 `{ data, error }` 不抛异常，react-query 需要抛异常 |
| 登录 | 保留 `auth.ts`，新增 `useLoginMutation` 包装 | `auth.ts` 管理 cookie，被 401 拦截器和 logout 按钮共用 |
| Provider | `QueryProvider` Client Component | Next.js App Router 标准模式，Server Component 中嵌入 Client Component |

## 实施步骤

### Step 1: 安装依赖

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools -w apps/admin-web
```

### Step 2: 创建 QueryProvider

新建 `apps/admin-web/src/components/QueryProvider.tsx`：
- 创建 `QueryClient`，配置 `staleTime: 30s`、`retry: 1`、`refetchOnWindowFocus: false`
- 包含 `ReactQueryDevtools`（开发调试用）
- 用 `useState` 初始化防止重复创建

修改 `apps/admin-web/src/app/layout.tsx`：在 `<body>` 内包裹 `QueryProvider`。

### Step 3: 创建 API 适配器

新建 `apps/admin-web/src/lib/query-adapter.ts`：

```typescript
export async function unwrapResult<T>(
  promise: Promise<{ data?: T; error?: unknown }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return data as T;
}
```

### Step 4: 创建 Query Key 工厂

新建 `apps/admin-web/src/hooks/query-keys.ts`：

```typescript
export const queryKeys = {
  overview: ['admin', 'overview'] as const,
  enterprises: {
    all: ['admin', 'enterprises'] as const,
    list: (params: { page: number; pageSize: number }) => ['admin', 'enterprises', params] as const,
  },
  users: {
    all: ['admin', 'users'] as const,
    list: (params: { page: number; pageSize: number }) => ['admin', 'users', params] as const,
  },
  apps: {
    all: ['admin', 'apps'] as const,
    list: ['admin', 'apps', 'list'] as const,
  },
};
```

### Step 5: 创建自定义 Hooks

新建以下 hooks 文件，每个包含 query 和 mutation hooks：

| 文件 | Query Hooks | Mutation Hooks |
|------|------------|----------------|
| `hooks/use-overview.ts` | `useOverview()` | - |
| `hooks/use-apps.ts` | `useApps()` | `useCreateApp()`, `useDeleteApp()` |
| `hooks/use-users.ts` | `useUsers()` | `useCreateUser()`, `useUpdateUser()`, `useDeleteUser()` |
| `hooks/use-enterprises.ts` | `useEnterprises()` | `useCreateEnterprise()`, `useUpdateEnterprise()`, `useDeleteEnterprise()` |
| `hooks/use-login.ts` | - | `useLoginMutation()` |

**关键设计：**

- **分页 hooks**（`useUsers`、`useEnterprises`）内部管理 `pagination` 状态，返回 `pagination` 和 `setPagination`，使用 `placeholderData: keepPreviousData` 防止翻页闪烁
- **Mutation hooks** 的 `onSuccess` 中调用 `queryClient.invalidateQueries()` 自动刷新相关数据，同时失效 `overview` 确保概览统计同步更新
- **Overview 页** 的 `useOverview()` 使用 `enabled: superAdmin` 条件查询

### Step 6: 迁移页面

按复杂度从低到高迁移：

**Apps 页**（最简单）：
- 替换 `useState` + `useEffect` → `useApps()`
- 替换 `useState(submitting)` → `useCreateApp().isPending` / `useDeleteApp().isPending`
- 删除手动 `loadData()` 调用

**Enterprises 页**（分页）：
- 替换为 `useEnterprises()`，分页状态由 hook 内部管理
- 突变使用 `useCreateEnterprise()` 等，`onSuccess` 中 toast + 关闭弹窗

**Users 页**（分页，与 Enterprises 模式相同）：
- 替换为 `useUsers()`，模式完全一致

**Overview 页**（多查询 + 条件查询）：
- 三个独立 `useQuery`：overview（`enabled: superAdmin`）、userCount、appCount
- 加载状态合并：`isLoading = overviewLoading || usersLoading || appsLoading`

**Login 页**：
- 替换 `useState(loading)` → `useLoginMutation().isPending`
- 错误处理从 `err?.response?.data?.message` → `err?.message || '登录失败'`

### Step 7: 验证

1. `npm run build:admin` — 编译通过，无类型错误
2. 启动 dev server，逐页测试：
   - 登录：loading 动画、成功跳转、失败提示
   - 概览：骨架屏 → 数据渲染，超级管理员看 4 卡片，企业管理员看 3 卡片
   - 应用管理：加载 → CRUD → 表格自动刷新
   - 用户管理：分页切换无闪烁 → CRUD → 表格自动刷新
   - 企业管理：同用户管理
3. DevTools 验证：查询 key 正确、缓存命中、变更后自动失效

## 涉及文件

### 新建
- `apps/admin-web/src/components/QueryProvider.tsx`
- `apps/admin-web/src/lib/query-adapter.ts`
- `apps/admin-web/src/hooks/query-keys.ts`
- `apps/admin-web/src/hooks/use-overview.ts`
- `apps/admin-web/src/hooks/use-apps.ts`
- `apps/admin-web/src/hooks/use-users.ts`
- `apps/admin-web/src/hooks/use-enterprises.ts`
- `apps/admin-web/src/hooks/use-login.ts`

### 修改
- `apps/admin-web/src/app/layout.tsx` — 添加 QueryProvider
- `apps/admin-web/src/app/login/page.tsx` — 使用 useLoginMutation
- `apps/admin-web/src/app/dashboard/page.tsx` — 使用 useQuery hooks
- `apps/admin-web/src/app/dashboard/apps/page.tsx` — 使用 useApps hooks
- `apps/admin-web/src/app/dashboard/users/page.tsx` — 使用 useUsers hooks
- `apps/admin-web/src/app/dashboard/enterprises/page.tsx` — 使用 useEnterprises hooks