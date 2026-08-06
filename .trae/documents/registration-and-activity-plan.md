# 用户注册与登录活动追踪方案

## 需求分析

1. 普通用户注册页面 — 自助注册账号，关联到企业
2. 企业用户注册页面 — 自助注册企业 + 管理员账号
3. 登录活动追踪 — 企业管理员可查看本企业下普通用户的登录记录
4. 企业管理员无法看到用户管理 — 隐藏侧边栏"用户管理"入口
5. 仅超级管理员可修改角色 — 已实现

## 实现方案

### 一、后端

#### 1.1 新增 LoginActivity 实体
- 表名：`login_activities`
- 字段：`id`(uuid), `userId`, `username`, `enterpriseId`, `appId`, `appName`, `ipAddress`, `createdAt`
- 记录每次 OAuth 登录事件

#### 1.2 AuthService 登录时记录活动
- 在 `login()` 方法中，当存在 `clientId` 时，创建 `LoginActivity` 记录
- 依赖注入 `LoginActivity` Repository

#### 1.3 新增注册端点
- `POST /api/v1/auth/register` — 普通用户注册（RegisterDto 新增 `enterpriseSlug` 可选字段，通过企业标识关联企业）
- `POST /api/v1/auth/register-enterprise` — 企业注册（新 DTO：username, password, email, enterpriseName, enterpriseSlug），同时创建企业 + 企业管理员用户

#### 1.4 Admin 端新增活动日志接口
- `GET /admin/enterprise/activity` — 企业管理员查看本企业登录活动（分页，按时间倒序）
- 在 `AdminService` 中新增 `getEnterpriseActivity` 方法

#### 1.5 限制企业管理员权限
- `AdminController` 中用户 CRUD 端点增加 `@Roles(Role.SUPER_ADMIN)` 限制
- 或保留原有端点但增加 `@Roles` 守卫

### 二、前端

#### 2.1 注册页面
- `/register` — 普通用户注册表单（用户名、密码、邮箱、企业标识可选）
- `/register/enterprise` — 企业注册表单（用户名、密码、邮箱、企业名称、企业标识）

#### 2.2 侧边栏调整
- "用户管理" 改为 `adminOnly: true`，仅超级管理员可见
- 新增 "活动记录" 导航项，仅企业管理员可见

#### 2.3 活动记录页面
- `/dashboard/activity` — 企业管理员查看登录活动列表
- 表格列：用户名、应用名称、登录时间
- 支持分页

### 三、关键文件

| 文件 | 变更 |
|------|------|
| `apps/server/src/modules/auth/login-activity.entity.ts` | **新建** — 登录活动实体 |
| `apps/server/src/modules/auth/auth.module.ts` | 修改 — 注册 LoginActivity 实体 |
| `apps/server/src/modules/auth/auth.service.ts` | 修改 — login() 记录活动 |
| `apps/server/src/modules/auth/auth.controller.ts` | 修改 — 新增 register/register-enterprise 端点 |
| `apps/server/src/modules/user/dto/register.dto.ts` | 修改 — 新增 enterpriseSlug 字段 |
| `apps/server/src/modules/user/user.service.ts` | 修改 — register 支持 enterpriseSlug |
| `apps/server/src/modules/auth/dto/register-enterprise.dto.ts` | **新建** — 企业注册 DTO |
| `apps/server/src/modules/admin/admin.controller.ts` | 修改 — 新增 activity 端点，限制用户 CRUD |
| `apps/server/src/modules/admin/admin.service.ts` | 修改 — 新增 getEnterpriseActivity |
| `apps/server/src/app.module.ts` | 修改 — 注册 LoginActivity 实体 |
| `apps/admin-web/src/app/register/page.tsx` | **新建** — 普通用户注册页 |
| `apps/admin-web/src/app/register/enterprise/page.tsx` | **新建** — 企业注册页 |
| `apps/admin-web/src/app/dashboard/DashboardLayoutClient.tsx` | 修改 — 调整导航项 |
| `apps/admin-web/src/app/dashboard/activity/page.tsx` | **新建** — 活动记录页 |
| `apps/admin-web/src/hooks/use-activity.ts` | **新建** — 活动记录 hook |
| `apps/admin-web/src/hooks/use-register.ts` | **新建** — 注册 hook |
| `packages/shared/src/types/` | 修改 — 新增类型 |

### 四、验证步骤

1. 构建 server：`pnpm run build:server`
2. 导出 OpenAPI 并重新生成 SDK
3. 构建 admin-web：`pnpm run build -w @nestjs-sso/admin-web`
4. 启动服务器，访问 `/register` 和 `/register/enterprise` 测试注册流程
5. 以企业管理员登录，验证"用户管理"不可见，"活动记录"可见
6. 通过 OAuth 登录普通用户，验证活动记录中有新条目