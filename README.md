# NestJS SSO — 统一认证中心 (Monorepo)

基于 NestJS 的单点登录（SSO）统一认证中心，遵循 OAuth 2.0 / OpenID Connect 标准，支持多租户隔离、企业级管理后台、品牌定制化登录页。

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                     NestJS SSO Monorepo                           │
│                                                                   │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │  apps/admin-web      │  │  apps/server (IdP)               │  │
│  │  (Next.js 管理后台)   │  │                                  │  │
│  │                     │  │  ┌─────────┐  ┌───────────────┐  │  │
│  │  • 登录/仪表盘       │  │  │  OAuth   │  │   Admin API   │  │  │
│  │  • 企业管理          │  │  │  2.0/OIDC│  │  /api/v1/admin│  │  │
│  │  • 用户管理          │  │  │  /oauth/*│  │               │  │  │
│  │  • 应用管理          │  │  └─────────┘  └───────────────┘  │  │
│  └────────┬────────────┘  │  ┌─────────┐  ┌───────────────┐  │  │
│           │                │  │  用户    │  │   企业/租户    │  │  │
│           │  HTTP API      │  │  管理    │  │   管理         │  │  │
│           │  (Bearer)      │  └─────────┘  └───────────────┘  │  │
│           │                │  ┌─────────┐  ┌───────────────┐  │  │
│           ▼                │  │  SP 应用 │  │   演示 SP      │  │  │
│                            │  │  管理    │  │   /sp          │  │  │
│  ┌─────────────────────┐  │  └─────────┘  └───────────────┘  │  │
│  │  packages/shared     │  │                                  │  │
│  │  (共享类型定义)       │  │  Port: 3000                      │  │
│  │  Port: N/A            │  └──────────────────────────────────┘  │
│  └─────────────────────┘                                          │
│                                                                   │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │  tools/eslint-config │  │  docs/                            │  │
│  │  (共享 ESLint 配置)   │  │  architecture.md                 │  │
│  └─────────────────────┘  │  development.md                   │  │
│                           │  deployment.md                    │  │
│                           └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │                              ▲
         │  OAuth 2.0 / OIDC            │
         ▼                              │
┌──────────────────┐          ┌──────────────────┐
│  业务系统 A (SP)   │          │  业务系统 B (SP)   │
│  /sp (内置演示)    │          │  (第三方接入)      │
└──────────────────┘          └──────────────────┘
```

## 核心特性

- **OAuth 2.0 / OpenID Connect 标准**：Authorization Code Flow + PKCE、Token、UserInfo、Introspection、Revocation、RP-Initiated Logout
- **OIDC Discovery**：`/.well-known/openid-configuration` 自动发现，`/.well-known/jwks.json` 公钥暴露
- **多租户隔离**：企业（Enterprise）级别账号隔离，角色权限控制（超级管理员 / 企业管理员 / 普通用户）
- **管理后台**：Next.js 独立前端，管理企业、用户、应用
- **品牌定制**：每个应用可配置 Logo、主色调、背景图，登录页动态渲染
- **双 Token 机制**：Access Token（15分钟）+ Refresh Token（7天），支持刷新令牌轮换
- **双签名算法**：HS256（全局） + RS256（应用专属 RSA 密钥对）

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 安装与运行

```bash
# 1. 安装依赖（npm workspaces 自动安装所有子项目）
npm install

# 2. 构建共享包
npm run build:shared

# 3. 启动后端（端口 3000）
npm run dev:server

# 4. 另开终端，启动管理后台（端口 3001）
npm run dev:admin
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 后端 API | <http://localhost:3000> |
| Swagger 文档 | <http://localhost:3000/docs> |
| 管理后台 | <http://localhost:3001> |
| 演示 SP | <http://localhost:3000/sp> |
| OIDC Discovery | <http://localhost:3000/.well-known/openid-configuration> |
| 健康检查 | <http://localhost:3000/health> |

### 测试账号

种子数据自动初始化：

| 用户名 | 密码 | 角色 | 适用系统 |
|--------|------|------|---------|
| `admin` | `Admin@123` | 超级管理员 | 管理后台 |
| `entadmin` | `Admin@123` | 企业管理员 | 管理后台 |
| `demo` | `demo123` | 普通用户 | 演示 SP |

## 项目结构

```
nestjs-sso/
├── apps/
│   ├── server/               # NestJS 后端（IdP 认证中心）
│   └── admin-web/            # Next.js 管理后台前端
├── packages/
│   └── shared/               # 共享 TypeScript 类型定义与常量
├── tools/
│   └── eslint-config/        # 共享 ESLint 配置
├── docs/
│   ├── architecture.md       # 系统架构文档
│   ├── development.md        # 开发指南
│   └── deployment.md         # 部署指南
├── .editorconfig             # 编辑器统一配置
├── .prettierrc               # 代码格式化配置
├── tsconfig.base.json        # 基础 TypeScript 配置
├── CONTRIBUTING.md           # 贡献指南
└── package.json              # 根工作区配置（npm workspaces）
```

详细说明见 [docs/architecture.md](docs/architecture.md)。

## OAuth 2.0 / OIDC 端点

所有 OAuth 端点使用根路径，无 API 前缀：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/oauth/authorize` | 授权端点（Authorization Code Flow） |
| GET/POST | `/oauth/login` | 登录页面 / 登录提交 |
| POST | `/oauth/token` | 令牌端点（code → access_token + id_token + refresh_token） |
| GET | `/oauth/userinfo` | 用户信息端点（Bearer access_token） |
| POST | `/oauth/introspect` | 令牌内省（RFC 7662） |
| POST | `/oauth/revoke` | 令牌撤销（RFC 7009） |
| GET | `/oauth/endsession` | RP-Initiated Logout |
| GET | `/.well-known/openid-configuration` | OIDC Discovery |
| GET | `/.well-known/jwks.json` | JWKS 公钥端点 |

## API 接口

所有 API 使用 `/api/v1` 前缀。

### 管理后台 API（`/api/v1/admin`）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/admin/login` | 公开 | 管理员登录 |
| GET | `/admin/me` | Bearer | 获取当前管理员信息 |
| GET | `/admin/overview` | Bearer | 系统概览数据 |
| GET | `/admin/enterprises/:id/users` | Bearer | 企业用户列表（超管） |
| GET | `/admin/enterprises/:id/apps` | Bearer | 企业应用列表（超管） |
| GET | `/admin/enterprise/users` | Bearer | 本企业用户列表（企管） |
| POST | `/admin/enterprise/users` | Bearer | 创建用户 |
| GET | `/admin/enterprise/apps` | Bearer | 本企业应用列表 |
| POST | `/admin/enterprise/apps` | Bearer | 创建应用 |

### 企业 API（`/api/v1/enterprises`）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/enterprises` | Bearer | 创建企业（超管） |
| GET | `/enterprises` | Bearer | 企业列表（超管） |
| GET | `/enterprises/:id` | Bearer | 企业详情 |
| PATCH | `/enterprises/:id` | Bearer | 更新企业 |
| DELETE | `/enterprises/:id` | Bearer | 删除企业 |

### 用户 API（`/api/v1/users`）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/users/register` | 公开 | 用户注册 |
| GET | `/users/profile` | Bearer | 获取用户资料 |

### 应用管理 API（`/api/v1/apps`）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/apps` | Bearer | 注册 SP 应用 |
| GET | `/apps` | Bearer | 应用列表 |
| GET | `/apps/:appId` | Bearer | 应用详情 |
| DELETE | `/apps/:appId` | Bearer | 删除应用 |

### 认证 API（`/api/v1/auth`）— 兼容保留

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/auth/login` | 公开 | 账号密码登录 |
| POST | `/auth/validate` | 公开 | 校验 Token 有效性 |
| POST | `/auth/session/ping` | 公开 | 会话探活 |

## 外部系统接入

详细接入文档见 [docs/architecture.md](docs/architecture.md)。

### 快速接入步骤

1. **注册应用**：在管理后台或通过 API 注册 SP 应用，获取 `client_id` 和 `client_secret`
2. **发起授权**：将用户重定向到 `/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&scope=openid+profile&code_challenge=...&code_challenge_method=S256`
3. **换取令牌**：用户授权后，用 Authorization Code 调用 `POST /oauth/token`
4. **获取用户信息**：用 Access Token 调用 `GET /oauth/userinfo`
5. **刷新令牌**：Access Token 过期后用 Refresh Token 调用 `POST /oauth/token`（grant_type=refresh_token）
6. **单点登出**：调用 `GET /oauth/endsession?id_token_hint=...&post_logout_redirect_uri=...`

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | NestJS 10 + TypeScript |
| 前端 | Next.js 16 (App Router) + Ant Design 6 |
| 数据库 | SQLite（开发）/ PostgreSQL / MySQL |
| ORM | TypeORM 0.3 |
| 认证 | OAuth 2.0 + OpenID Connect + JWT（HS256 + RS256） |
| 包管理 | npm workspaces（Monorepo） |
| API 文档 | Swagger（@nestjs/swagger） |
| 校验 | class-validator + class-transformer |
| 限流 | @nestjs/throttler |

## 配置参考

所有配置通过 `.env` 文件管理：

```bash
# 服务端口
PORT=3000

# JWT 密钥（生产环境务必更换）
JWT_SECRET=change-me-in-production

# 数据库
DATABASE_TYPE=better-sqlite3    # 或 postgres / mysql
DATABASE_DATABASE=./sso.sqlite

# API 前缀
API_PREFIX=api/v1

# Token 有效期
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## 开发命令

```bash
# 构建
npm run build              # 构建所有子项目
npm run build:shared       # 仅构建共享包
npm run build:server       # 仅构建后端
npm run build:admin        # 仅构建前端

# 开发
npm run dev:server         # 启动后端（watch 模式）
npm run dev:admin          # 启动前端（HMR）

# 代码质量
npm run lint               # ESLint 检查
npm run format             # 格式化代码
npm run test               # 运行测试

# 清理
npm run clean              # 清理所有构建产物
```

## 文档

- [系统架构文档](docs/architecture.md) — 目录结构、模块职责、数据流、设计决策
- [开发指南](docs/development.md) — 环境搭建、开发流程、常见问题
- [部署指南](docs/deployment.md) — 生产构建、Nginx 配置、Docker 部署
- [贡献指南](CONTRIBUTING.md) — 代码规范、Commit 规范、PR 流程

## License

MIT