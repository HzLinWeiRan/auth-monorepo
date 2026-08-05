# 系统架构文档

## 概述

NestJS SSO Monorepo 是一个基于 NestJS 的单点登录（SSO）统一认证中心，遵循 OAuth 2.0 / OpenID Connect 标准，支持多租户隔离和企业级管理。

## 目录结构

```
nestjs-sso/
├── .editorconfig                 # 编辑器统一配置（缩进、换行符、字符集）
├── .prettierrc                   # 代码格式化配置
├── .prettierignore               # 格式化忽略规则
├── .nvmrc                        # Node.js 版本锁定（20）
├── .gitignore                    # Git 忽略规则
├── package.json                  # 根工作区配置（npm workspaces）
├── tsconfig.base.json            # 基础 TypeScript 配置（所有子项目 extend）
├── CONTRIBUTING.md               # 贡献指南（含 Commit 规范）
├── README.md                     # 项目说明
├── .env                          # 环境变量（所有子项目共享）
│
├── apps/                         # 应用程序（可独立部署）
│   ├── server/                   # NestJS 后端服务
│   │   ├── package.json          # @nestjs-sso/server
│   │   ├── tsconfig.json         # TypeScript 开发配置
│   │   ├── tsconfig.build.json   # TypeScript 构建配置
│   │   ├── nest-cli.json         # NestJS CLI 配置
│   │   ├── .env.example          # 环境变量示例
│   │   ├── src/
│   │   │   ├── main.ts           # 应用入口
│   │   │   ├── app.module.ts     # 根模块
│   │   │   ├── app.controller.ts # 根控制器（健康检查）
│   │   │   ├── config/           # 配置模块
│   │   │   ├── common/           # 公共组件
│   │   │   │   ├── decorators/   # 自定义装饰器（@Public, @Roles, @CurrentUser）
│   │   │   │   ├── dto/          # 通用 DTO（ErrorResponseDto）
│   │   │   │   ├── enums/        # 枚举定义
│   │   │   │   ├── filters/      # 异常过滤器
│   │   │   │   ├── guards/       # 守卫（JWT 认证, 角色鉴权）
│   │   │   │   ├── strategies/   # Passport 策略
│   │   │   │   └── utils/        # 工具函数
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # 认证核心（OAuth 2.0 / OIDC）
│   │   │   │   ├── user/         # 用户管理
│   │   │   │   ├── app/          # 应用（SP）注册管理
│   │   │   │   ├── enterprise/   # 企业（多租户）管理
│   │   │   │   ├── admin/        # 管理后台 API
│   │   │   │   └── demo-sp/      # 演示 SP（内嵌）
│   │   │   └── seeds/            # 种子数据
│   │   └── test/                 # 测试文件
│   │
│   └── admin-web/                # Next.js 管理后台前端
│       ├── package.json          # @nestjs-sso/admin-web
│       ├── tsconfig.json         # TypeScript 配置
│       ├── next.config.ts        # Next.js 配置
│       ├── postcss.config.mjs    # PostCSS 配置
│       ├── eslint.config.mjs     # ESLint 配置（flat config）
│       ├── public/               # 静态资源
│       └── src/
│           ├── app/              # Next.js App Router 页面
│           │   ├── layout.tsx    # 根布局
│           │   ├── page.tsx      # 首页（重定向）
│           │   ├── login/        # 登录页
│           │   └── dashboard/    # 管理后台
│           │       ├── layout.tsx
│           │       ├── page.tsx        # 概览面板
│           │       ├── enterprises/    # 企业管理
│           │       ├── users/          # 用户管理
│           │       └── apps/           # 应用管理
│           ├── lib/              # 工具库
│           │   ├── api.ts        # Axios HTTP 客户端
│           │   └── auth.ts       # 认证工具
│           └── middleware.ts     # 路由中间件（认证拦截）
│
├── packages/                     # 共享库（纯 TypeScript）
│   └── shared/                   # 共享类型定义与常量
│       ├── package.json          # @nestjs-sso/shared
│       ├── tsconfig.json         # TypeScript 配置
│       └── src/
│           ├── index.ts          # 统一导出
│           ├── types/            # 类型定义
│           │   ├── user.ts       # User 类型
│           │   ├── enterprise.ts # Enterprise 类型
│           │   ├── app.ts        # AppInfo 类型
│           │   ├── admin.ts      # AdminUser, LoginResponse 类型
│           │   ├── response.ts   # ApiResponse, PaginatedResponse 类型
│           │   └── roles.ts      # Role 常量与类型
│           └── constants/
│               └── api.ts        # API 端点常量
│
├── tools/                        # 工具配置
│   └── eslint-config/            # 共享 ESLint 配置（后端）
│       ├── package.json          # @nestjs-sso/eslint-config
│       └── base.js               # ESLint 规则
│
└── docs/                         # 文档
    ├── architecture.md           # 系统架构文档（本文件）
    ├── development.md            # 开发指南
    └── deployment.md             # 部署指南
```

## 模块职责

### 1. apps/server — NestJS 后端

| 模块 | 路径 | 职责 |
|------|------|------|
| AuthModule | `modules/auth/` | OAuth 2.0 / OIDC 认证核心，包含授权、令牌、用户信息、令牌撤销、会话管理 |
| UserModule | `modules/user/` | 用户注册、登录、信息查询 |
| AppModule | `modules/app/` | 业务系统（SP）注册管理 |
| EnterpriseModule | `modules/enterprise/` | 企业（租户）CRUD 管理 |
| AdminModule | `modules/admin/` | 管理后台 API（登录、概览、企业/用户/应用管理） |
| DemoSpModule | `modules/demo-sp/` | 内嵌演示 SP，展示 OAuth 2.0 授权码流程 |
| SeedModule | `seeds/` | 种子数据初始化（默认企业、管理员账号） |

### 2. apps/admin-web — Next.js 前端

| 页面 | 路径 | 功能 |
|------|------|------|
| 登录页 | `/login` | 管理员登录 |
| 概览面板 | `/dashboard` | 系统总览（企业数、用户数、应用数） |
| 企业管理 | `/dashboard/enterprises` | 企业 CRUD（仅超级管理员） |
| 用户管理 | `/dashboard/users` | 本企业用户管理 |
| 应用管理 | `/dashboard/apps` | 本企业应用管理 |

### 3. packages/shared — 共享类型包

前后端共享的类型定义来源，确保接口契约一致性。通过 `@nestjs-sso/shared` 包名引用。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | ≥ 18 |
| 包管理器 | npm workspaces | ≥ 9 |
| 后端框架 | NestJS | 10.x |
| 前端框架 | Next.js | 16.x (App Router) |
| UI 组件库 | Ant Design | 6.x |
| ORM | TypeORM | 0.3.x |
| 数据库 | SQLite（开发）/ PostgreSQL / MySQL | — |
| 认证协议 | OAuth 2.0 + OpenID Connect | — |
| 语言 | TypeScript | 5.x |

## 数据流

### OAuth 2.0 Authorization Code Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│   用户    │     │  NestJS SSO  │     │  SP 业务  │
│ (Browser) │     │  (IdP)       │     │  (Client) │
└────┬─────┘     └──────┬───────┘     └────┬─────┘
     │                   │                  │
     │ ① 访问 SP 资源    │                  │
     │──────────────────────────────────────>│
     │                   │                  │
     │ ② 302 跳转 /oauth/authorize          │
     │<─────────────────────────────────────│
     │                   │                  │
     │ ③ GET /oauth/authorize?client_id=..&redirect_uri=.. │
     │──────────────────>│                  │
     │                   │                  │
     │ ④ 未登录 → 返回登录页               │
     │<──────────────────│                  │
     │                   │                  │
     │ ⑤ POST /oauth/login (用户名+密码)   │
     │──────────────────>│                  │
     │                   │                  │
     │ ⑥ 302 回调 SP (携带 Authorization Code) │
     │<──────────────────│                  │
     │                   │                  │
     │ ⑦ 跟随 302 到 SP /callback?code=..&state=.. │
     │──────────────────────────────────────>│
     │                   │                  │
     │                   │ ⑧ POST /oauth/token (code → token) │
     │                   │<─────────────────│
     │                   │                  │
     │                   │ ⑨ 返回 access_token + id_token + refresh_token │
     │                   │─────────────────>│
     │                   │                  │
     │                   │ ⑩ GET /oauth/userinfo (Bearer access_token) │
     │                   │<─────────────────│
     │                   │                  │
     │                   │ ⑪ 返回用户信息   │
     │                   │─────────────────>│
     │                   │                  │
     │ ⑫ SP 建立本地会话，返回受保护资源   │
     │<──────────────────────────────────────│
```

### 多租户隔离

```
┌─────────────────────────────────────────────┐
│              NestJS SSO (IdP)                │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 企业 A    │  │ 企业 B    │  │ 企业 C    │  │
│  │ users:    │  │ users:    │  │ users:    │  │
│  │  - user1  │  │  - user3  │  │  - user5  │  │
│  │  - user2  │  │  - user4  │  │  - user6  │  │
│  │ apps:     │  │ apps:     │  │ apps:     │  │
│  │  - app-a  │  │  - app-b  │  │  - app-c  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  超级管理员：跨企业访问                       │
│  企业管理员：仅本企业内访问                   │
└─────────────────────────────────────────────┘
```

## 角色权限体系

| 角色 | 常量值 | 权限范围 |
|------|--------|---------|
| 超级管理员 | `super_admin` | 全部权限：管理所有企业、用户、应用 |
| 企业管理员 | `enterprise_admin` | 本企业权限：管理本企业用户、应用 |
| 普通用户 | `user` | 基础权限：登录、个人信息 |

## 依赖关系图

```
nestjs-sso-monorepo (root)
├── apps/server (@nestjs-sso/server)
│   ├── depends on: @nestjs-sso/shared
│   └── devDepends on: @nestjs-sso/eslint-config
│
├── apps/admin-web (@nestjs-sso/admin-web)
│   └── depends on: @nestjs-sso/shared
│
├── packages/shared (@nestjs-sso/shared)
│   └── no dependencies (pure TypeScript)
│
└── tools/eslint-config (@nestjs-sso/eslint-config)
    └── peerDepends on: eslint ≥ 8
```

## 关键设计决策

### 1. npm workspaces 而非 Turborepo/Nx

项目规模适中（2 个 app + 1 个 shared 包），npm workspaces 原生支持无需额外工具，降低学习成本。

### 2. 共享类型包开发时无需编译

通过 TypeScript `paths` 映射，开发时直接引用 `packages/shared/src/` 源码，修改立即生效。生产构建时使用编译后的 `dist/` 产物。

### 3. 原生模块使用 tsc 而非 webpack 构建

`better-sqlite3` 是原生 C++ 模块，无法被 webpack 打包。使用 `tsc` 编译保留 `node_modules` 结构，原生模块正常运行。

### 4. Role 使用 const 对象而非 enum

```typescript
// const 对象 + type union，兼容 CJS 和 ESM
export const Role = {
  SUPER_ADMIN: 'super_admin',
  ENTERPRISE_ADMIN: 'enterprise_admin',
  USER: 'user',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
```

### 5. .env 文件位于 monorepo 根目录

方便前后端共享环境变量。NestJS ConfigModule 配置 `envFilePath: ['.env', '../../.env']` 兼容各运行路径。