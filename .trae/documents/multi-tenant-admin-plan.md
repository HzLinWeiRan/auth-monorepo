# 多租户企业管理系统 + Next.js 管理后台实施方案

## Context

当前 SSO 系统是单租户架构：所有用户、应用平铺在同一空间，没有企业/租户隔离。需要引入多租户能力，让不同企业的账号、应用完全隔离，并配套 Next.js 管理后台，供超级管理员和企业管理员管理各自的企业资源。

**用户已确认的设计决策：**
- 企业识别：通过 `client_id` → App → Enterprise 推导
- 角色体系：需要平台级超级管理员
- 用户名唯一性：企业内唯一（username + enterpriseId 联合唯一）
- Next.js 前端：monorepo 子目录 `admin-frontend/`

---

## 一、数据库架构变更

### 1.1 新增 Enterprise 实体

**新文件**: `src/modules/enterprise/enterprise.entity.ts`

```typescript
@Entity('enterprises')
export class Enterprise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 128 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 64, unique: true })
  slug: string;                              // URL 友好标识

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;                            // active / disabled

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 1.2 User 实体修改

**修改文件**: `src/modules/user/user.entity.ts`

- 新增 `enterpriseId` 列（nullable，超级管理员不属于任何企业）
- 新增 `roles` 列（varchar, 逗号分隔，如 `super_admin,enterprise_admin,user`）
- 新增 `@Unique(['username', 'enterpriseId'])` 复合唯一约束（替换原 username 唯一索引）

### 1.3 App 实体修改

**修改文件**: `src/modules/app/app.entity.ts`

- 新增 `enterpriseId` 列（nullable）

---

## 二、角色系统

### 2.1 角色枚举

**新文件**: `src/common/enums/role.enum.ts`

```typescript
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ENTERPRISE_ADMIN = 'enterprise_admin',
  USER = 'user',
}
```

### 2.2 Roles 装饰器

**新文件**: `src/common/decorators/roles.decorator.ts`

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### 2.3 Roles 守卫

**新文件**: `src/common/guards/roles.guard.ts`

在 JwtAuthGuard 之后执行，从 `request.user` 获取角色并匹配。super_admin 自动通过所有检查。

### 2.4 JwtStrategy 修改

**修改文件**: `src/common/strategies/jwt.strategy.ts`

- `validate()` 方法返回新增 `enterpriseId` 和 `roles` 字段
- 注入 `UserService`，通过 `payload.sub` 查库获取最新角色（而非仅 JWT payload）

---

## 三、企业模块

**新文件结构**:
```
src/modules/enterprise/
  ├── enterprise.entity.ts
  ├── enterprise.module.ts
  ├── enterprise.service.ts
  ├── enterprise.controller.ts
  └── dto/
      ├── create-enterprise.dto.ts
      └── update-enterprise.dto.ts
```

**API 端点**（`/api/v1/enterprises`，超级管理员专用）：
- `GET /enterprises` — 企业列表（分页）
- `POST /enterprises` — 创建企业
- `GET /enterprises/:id` — 企业详情
- `PATCH /enterprises/:id` — 更新企业
- `DELETE /enterprises/:id` — 删除企业（级联禁用该企业所有用户）

---

## 四、管理后台 API 模块

**新文件结构**:
```
src/modules/admin/
  ├── admin.module.ts
  ├── admin.controller.ts
  ├── admin.service.ts
  └── dto/
      ├── admin-login.dto.ts
      └── admin-user-create.dto.ts
```

### 4.1 API 端点

**超级管理员** (`/api/v1/admin/`)：

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/admin/login` | 管理后台登录 | @Public() |
| GET | `/admin/me` | 当前管理员信息 | @Roles(SUPER_ADMIN, ENTERPRISE_ADMIN) |
| GET | `/admin/overview` | 系统概览统计 | @Roles(SUPER_ADMIN) |
| GET | `/admin/enterprises` | 企业列表 | @Roles(SUPER_ADMIN) |
| POST | `/admin/enterprises` | 创建企业 | @Roles(SUPER_ADMIN) |
| GET | `/admin/enterprises/:id/users` | 企业下用户 | @Roles(SUPER_ADMIN) |
| GET | `/admin/enterprises/:id/apps` | 企业下应用 | @Roles(SUPER_ADMIN) |

**企业管理员** (`/api/v1/admin/enterprise/`)：

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/admin/enterprise/users` | 本企业用户列表 | @Roles(ENTERPRISE_ADMIN) |
| POST | `/admin/enterprise/users` | 创建本企业用户 | @Roles(ENTERPRISE_ADMIN) |
| PATCH | `/admin/enterprise/users/:id` | 更新用户 | @Roles(ENTERPRISE_ADMIN) |
| DELETE | `/admin/enterprise/users/:id` | 删除用户 | @Roles(ENTERPRISE_ADMIN) |
| GET | `/admin/enterprise/apps` | 本企业应用列表 | @Roles(ENTERPRISE_ADMIN) |
| POST | `/admin/enterprise/apps` | 创建本企业应用 | @Roles(ENTERPRISE_ADMIN) |
| PATCH | `/admin/enterprise/apps/:id` | 更新应用 | @Roles(ENTERPRISE_ADMIN) |
| DELETE | `/admin/enterprise/apps/:id` | 删除应用 | @Roles(ENTERPRISE_ADMIN) |

> **越权防护**: 企业管理员的 `enterpriseId` 从 JWT 解析，不从前端传入。超级管理员通过 `/admin/enterprises/:id/` 路径参数指定企业。

---

## 五、认证流程改造

### 5.1 AuthService.login() 企业作用域

**修改文件**: `src/modules/auth/auth.service.ts`

- 接收可选的 `clientId` / `enterpriseSlug` 参数
- 有 `clientId` → 查 App → 获取 `enterpriseId` → 在该企业内查找用户
- 无 `clientId` → 全局查找（用于管理后台登录）

### 5.2 UserService 新增方法

**修改文件**: `src/modules/user/user.service.ts`

- `findByUsernameAndEnterpriseId(username, enterpriseId)` — 企业内查找
- `findByEnterpriseId(enterpriseId, pagination)` — 分页获取企业用户
- `register(dto)` 增加 `enterpriseId` 参数

### 5.3 AppService 修改

**修改文件**: `src/modules/app/app.service.ts`

- `create(dto)` 增加 `enterpriseId` 参数
- `findByEnterpriseId(enterpriseId)` — 获取企业下应用列表

---

## 六、种子数据

**新文件**: `src/seeds/seed.service.ts`

在 `OnModuleInit` 中幂等插入：
- 默认企业：`{ name: '默认企业', slug: 'default', status: 'active' }`
- 超级管理员：`{ username: 'admin', password: 'Admin@123', roles: 'super_admin', enterpriseId: null }`
- 企业管理员：`{ username: 'entadmin', password: 'Admin@123', roles: 'enterprise_admin', enterpriseId: <default-id> }`

---

## 七、Next.js 管理后台

### 7.1 项目位置

`/Users/linweiran/work/nestjs-sso/admin-frontend/`

### 7.2 技术栈

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Ant Design 5.x（`antd` + `@ant-design/nextjs-registry`）
- Axios（API 调用）
- js-cookie（Token 管理）

### 7.3 项目结构

```
admin-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # 根布局
│   │   ├── page.tsx                      # 重定向到 /login
│   │   ├── login/
│   │   │   └── page.tsx                  # 登录页
│   │   └── dashboard/
│   │       ├── layout.tsx                # 管理后台布局（侧边栏+顶栏）
│   │       ├── page.tsx                  # 概览页
│   │       ├── enterprises/
│   │       │   ├── page.tsx              # 企业列表
│   │       │   └── [id]/
│   │       │       └── page.tsx          # 企业详情/编辑
│   │       ├── users/
│   │       │   ├── page.tsx              # 用户列表
│   │       │   └── [id]/
│   │       │       └── page.tsx          # 用户详情/编辑
│   │       └── apps/
│   │           ├── page.tsx              # 应用列表
│   │           └── [id]/
│   │               └── page.tsx          # 应用详情/编辑
│   ├── lib/
│   │   ├── api.ts                        # Axios 实例（拦截器、token 注入）
│   │   ├── auth.ts                       # 认证工具
│   │   └── types.ts                      # 类型定义
│   ├── components/
│   │   ├── AdminLayout.tsx               # 管理后台布局
│   │   ├── EnterpriseForm.tsx            # 企业表单
│   │   ├── UserForm.tsx                  # 用户表单
│   │   └── AppForm.tsx                   # 应用表单
│   └── middleware.ts                     # 路由守卫
├── next.config.ts
├── package.json
└── tailwind.config.ts
```

### 7.4 认证流程

1. 管理员访问 `/login` → 输入用户名密码
2. 调用 `POST /api/v1/admin/login` → 后端校验角色
3. 返回 `{ accessToken, user: { roles, enterpriseId, ... } }`
4. Token 存入 Cookie，根据 `roles` 渲染不同界面
5. Axios 拦截器自动注入 Bearer Token，401 时跳转登录页

### 7.5 关键页面

- **登录页**: 居中卡片表单，品牌风格
- **概览页**: 超管看到企业/用户/应用统计；企业管理员看到本企业统计
- **企业列表**: Ant Design Table，支持搜索、分页、CRUD 操作
- **用户/应用列表**: Table + 搜索 + 分页 + Modal 表单

---

## 八、实施顺序

### 阶段 1: 数据模型层
1. 创建 `Enterprise` 实体
2. 修改 `User` 实体（enterpriseId、roles、复合唯一约束）
3. 修改 `App` 实体（enterpriseId）
4. 更新 `app.module.ts` 注册新实体
5. 创建角色枚举、装饰器、守卫

### 阶段 2: 企业模块
6. 创建 `EnterpriseModule`、`EnterpriseService`、`EnterpriseController`
7. 实现企业 CRUD

### 阶段 3: 认证与用户服务改造
8. 修改 `UserService`（企业作用域方法）
9. 修改 `AuthService.login()`（企业作用域）
10. 修改 `JwtStrategy`（返回 enterpriseId 和 roles）
11. 修改 `AppService`（企业作用域）

### 阶段 4: 管理后台 API
12. 创建 `AdminModule`、`AdminService`、`AdminController`
13. 实现管理员登录、系统概览
14. 实现超级管理员和企业管理员端点

### 阶段 5: 种子数据
15. 创建 `SeedService`，确保默认企业和管理员账号

### 阶段 6: Next.js 前端
16. 初始化 Next.js 项目
17. 实现 API 客户端层、认证逻辑
18. 实现登录页
19. 实现管理后台布局和路由守卫
20. 实现超级管理员页面（概览、企业 CRUD）
21. 实现企业管理员页面（用户 CRUD、应用 CRUD）

### 阶段 7: 集成验证
22. 端到端测试完整流程

---

## 九、验证步骤

1. 启动后端 → 种子数据自动创建 → 数据库有默认企业和 admin 账号
2. `POST /api/v1/admin/login { username: 'admin', password: 'Admin@123' }` → 返回 token
3. 超管创建新企业 → 创建企业管理员 → 企业管理员登录成功
4. 企业管理员创建用户 → 同一企业内重名返回 409 → 不同企业可重名
5. 企业管理员 A 无法访问企业 B 的用户列表 → 403
6. SSO 登录：使用企业 A 的 client_id 登录，只能用企业 A 的用户
7. Next.js 前端：登录 → 仪表盘 → 管理企业/用户/应用全流程正常

---

## 十、注意事项

1. **SQLite 限制**: 使用 `synchronize: true` 重建表，需要删除旧 `sso.sqlite` 文件
2. **端口冲突**: Next.js 默认 3000，NestJS 也是 3000。将 NestJS 改为 3001 或 Next.js 改为 3001
3. **模块循环依赖**: `AdminModule` 依赖多个模块，必要时使用 `forwardRef()`
4. **向后兼容**: 保留原有 `findByUsername` 方法，无 `clientId` 时回退到全局查找
5. **Roles 列**: 当前使用逗号分隔字符串，后续可迁移到 `user_roles` 关系表