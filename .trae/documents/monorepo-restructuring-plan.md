# Monorepo 项目结构重组方案

## Context

当前项目结构存在以下问题：

1. **松散耦合**：NestJS 后端在根目录，Next.js 前端在 `admin-frontend/` 子目录，各自独立 `package.json`，需要分别 `npm install`
2. **无共享代码**：前端 `src/lib/types.ts` 手动复制了后端类型定义（User、Enterprise、AppInfo 等），而后端 `src/common/enums/role.enum.ts` 也独占 Role 枚举，缺乏统一的类型来源
3. **无统一工具链**：缺少共享的 ESLint/Prettier 配置，两端各自维护，版本不一致（后端 ESLint 8，前端 ESLint 9）
4. **无标准构建流程**：没有统一的构建、测试、部署脚本，不支持 CI/CD 一键构建
5. **admin-frontend 是嵌套 git 仓库**：有自己的 `.git` 目录，不利于统一版本管理
6. **无代码规范文档**：缺少 `.editorconfig`、`.prettierrc`、Commit 规范、贡献指南

## 目标

将项目重组为符合行业最佳实践的 Monorepo 结构，使用 **npm workspaces**（原生支持，无需额外工具），实现：

- 清晰的目录职责划分：`apps/`、`packages/`、`tools/`、`docs/`
- 统一的依赖管理：一次 `npm install` 安装所有依赖
- 共享类型包：前后端从同一源头导入类型定义
- 标准化工具链：统一的 Prettier、TypeScript Base Config
- 独立开发部署：各子项目可独立运行，但共享资源
- 规范的文档体系：架构文档、开发指南、部署指南、API 文档

## 技术选型

| 层级 | 技术 | 原因 |
|------|------|------|
| 包管理器 | npm workspaces | 原生支持，无需额外工具（Turborepo/Nx 过于复杂） |
| 共享类型 | 纯 TypeScript 包 | 无运行时依赖，编译为 CommonJS，兼容前后端 |
| 代码格式化 | Prettier 3 | 统一格式化，根目录配置 |
| 代码规范 | ESLint 8（后端）/ ESLint 9（前端） | 保持各自生态兼容，不强制统一 |
| 提交规范 | Conventional Commits | 行业标准，便于生成 Changelog |

## 目标目录结构

```
nestjs-sso/
├── .gitignore
├── .editorconfig                       # 编辑器统一配置
├── .prettierrc                         # 代码格式化配置
├── .prettierignore
├── .nvmrc                              # Node 版本锁定（20）
├── package.json                        # 根工作区配置（仅 devDependencies）
├── tsconfig.base.json                  # 基础 TypeScript 配置
├── CONTRIBUTING.md                     # 贡献指南（含 Commit 规范）
├── README.md                           # 更新后的项目说明
├── .env                                # 环境变量（gitignored，放根目录方便 monorepo 共享）
│
├── apps/
│   ├── server/                         # NestJS 后端（从根目录 src/ 迁移）
│   │   ├── package.json                # @nestjs-sso/server
│   │   ├── tsconfig.json               # extends ../../tsconfig.base.json
│   │   ├── tsconfig.build.json
│   │   ├── nest-cli.json
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── app.controller.ts
│   │   │   ├── config/
│   │   │   ├── common/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── user/
│   │   │   │   ├── app/
│   │   │   │   ├── enterprise/
│   │   │   │   ├── admin/
│   │   │   │   └── demo-sp/
│   │   │   └── seeds/
│   │   └── test/
│   │
│   └── admin-web/                      # Next.js 前端（从 admin-frontend/ 迁移）
│       ├── package.json                # @nestjs-sso/admin-web
│       ├── tsconfig.json               # extends ../../tsconfig.base.json
│       ├── next.config.ts
│       ├── postcss.config.mjs
│       ├── eslint.config.mjs
│       ├── public/
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx
│           │   ├── login/
│           │   └── dashboard/
│           ├── lib/
│           │   ├── api.ts
│           │   └── auth.ts             # types.ts 移除，改用 @nestjs-sso/shared
│           └── middleware.ts
│
├── packages/
│   └── shared/                         # 共享类型定义与常量
│       ├── package.json                # @nestjs-sso/shared
│       ├── tsconfig.json               # extends ../../tsconfig.base.json
│       └── src/
│           ├── index.ts                # 统一导出
│           ├── types/
│           │   ├── user.ts
│           │   ├── enterprise.ts
│           │   ├── app.ts
│           │   ├── admin.ts
│           │   ├── response.ts
│           │   └── roles.ts
│           └── constants/
│               └── api.ts
│
├── tools/
│   └── eslint-config/                  # 共享 ESLint 配置（后端用）
│       ├── package.json                # @nestjs-sso/eslint-config
│       └── base.js
│
└── docs/
    ├── architecture.md                  # 系统架构文档
    ├── development.md                   # 开发指南
    └── deployment.md                    # 部署指南
```

---

## 实施步骤

### 阶段 1：准备工作（创建新目录和配置文件）

**步骤 1.1**：创建所有新目录
```bash
mkdir -p apps/server apps/admin-web
mkdir -p packages/shared/src/{types,constants}
mkdir -p tools/eslint-config
mkdir -p docs
```

**步骤 1.2**：创建根级配置文件

- `.editorconfig` — 统一缩进、换行符、字符集
- `.prettierrc` — `{ semi: true, singleQuote: true, trailingComma: "all", printWidth: 100 }`
- `.prettierignore` — 忽略 `dist/`、`.next/`、`node_modules/`、`coverage/`
- `.nvmrc` — 内容 `20`
- `tsconfig.base.json` — 基础 TypeScript 配置，所有子项目的 tsconfig 都 extend 它

**步骤 1.3**：创建新的根 `package.json`（含 workspaces 配置）

- 将旧 `package.json` 备份为 `package.json.backup`
- 新 `package.json` 的 `workspaces` 设置为 `["apps/*", "packages/*", "tools/*"]`
- 根 `scripts` 提供便捷的聚合命令（`dev`、`build`、`lint`、`test`、`format`）
- 根 `devDependencies` 仅包含 `prettier` 和 `typescript`（无运行时依赖）

**步骤 1.4**：创建 `packages/shared/` 共享类型包

- `package.json`：`@nestjs-sso/shared`，纯 TypeScript，编译输出到 `dist/`
- `tsconfig.json`：extend 根 base config
- 从 `admin-frontend/src/lib/types.ts` 提取类型定义
- 从 `src/common/enums/role.enum.ts` 提取 Role 定义（改为 `const` 对象 + type union，兼容 CJS/ESM）
- 从 `src/common/dto/response.dto.ts` 提取响应类型
- 新增 `constants/api.ts`：API 端点常量

**步骤 1.5**：创建 `tools/eslint-config/` 共享 ESLint 配置

- `package.json`：`@nestjs-sso/eslint-config`
- `base.js`：后端 NestJS 的 ESLint 8 配置（从前端配置中独立出来，前端继续用 ESLint 9）

### 阶段 2：迁移后端（`src/` → `apps/server/`）

**步骤 2.1**：移动后端源文件
```bash
mv src apps/server/src
mv test apps/server/test
mv nest-cli.json apps/server/
mv tsconfig.json apps/server/
mv tsconfig.build.json apps/server/
mv .env.example apps/server/
```

**步骤 2.2**：创建 `apps/server/package.json`

- 从 `package.json.backup` 提取依赖
- 包名改为 `@nestjs-sso/server`
- 添加 `@nestjs-sso/shared: "*"` 依赖
- 添加 `@nestjs-sso/eslint-config: "*"` devDependency
- 调整 Jest `coverageDirectory` 从 `../coverage` 改为 `../../coverage`（相对于 monorepo 根）

**步骤 2.3**：更新 `apps/server/tsconfig.json`

- 添加 `"extends": "../../tsconfig.base.json"`
- 添加 `paths` 映射 `@nestjs-sso/shared` → `../../packages/shared/src`
- 保留 NestJS 特有配置（`emitDecoratorMetadata`、`experimentalDecorators`）
- 保留宽松的 `strictNullChecks: false` 等（避免大量修改）

**步骤 2.4**：更新后端导入路径

- `src/common/enums/role.enum.ts` → 改为从 `@nestjs-sso/shared` 重新导出
- `src/common/dto/response.dto.ts` → 改为从 `@nestjs-sso/shared` 重新导出
- `src/config/configuration.ts` → 调整 `.env` 查找路径（`envFilePath: ['.env', '../../.env']`）

### 阶段 3：迁移前端（`admin-frontend/` → `apps/admin-web/`）

**步骤 3.1**：移动前端文件
```bash
# 排除 node_modules、.next、.git、package-lock.json
mv admin-frontend/src apps/admin-web/src
mv admin-frontend/public apps/admin-web/public
mv admin-frontend/*.{json,ts,mjs,js} apps/admin-web/
```

**步骤 3.2**：处理嵌套 Git 仓库

- 删除 `admin-frontend/.git`（嵌套 git 仓库）
- 所有文件统一由 monorepo 根目录的 Git 管理

**步骤 3.3**：创建 `apps/admin-web/package.json`

- 从旧 `admin-frontend/package.json` 提取依赖
- 包名改为 `@nestjs-sso/admin-web`
- 添加 `@nestjs-sso/shared: "*"` 依赖

**步骤 3.4**：更新 `apps/admin-web/tsconfig.json`

- 添加 `"extends": "../../tsconfig.base.json"`
- 添加 `paths` 映射 `@nestjs-sso/shared` → `../../packages/shared/src`
- 保留 Next.js 特有配置（`jsx: "react-jsx"`、`moduleResolution: "bundler"`）

**步骤 3.5**：更新前端导入

- 删除 `src/lib/types.ts`
- 更新 `src/lib/auth.ts` 中的 `AdminUser` 导入 → 从 `@nestjs-sso/shared`
- 更新 `src/app/dashboard/` 各页面中的类型导入 → 从 `@nestjs-sso/shared`

### 阶段 4：集成与验证

**步骤 4.1**：清理并重新安装依赖
```bash
rm -rf node_modules package-lock.json admin-frontend/node_modules admin-frontend/package-lock.json
npm install   # npm workspaces 自动 hoist 依赖，symlink 工作区包
```

**步骤 4.2**：更新 `.gitignore`
- 添加 `dist/`、`.next/`、`*.tsbuildinfo`、`coverage/` 等
- 确保 `.env` 被忽略

**步骤 4.3**：更新 `.vscode/launch.json`
- 指向新的 `apps/server` 和 `apps/admin-web` 路径

**步骤 4.4**：构建验证
```bash
npm run build:shared   # 编译共享类型包
npm run dev:server     # 验证后端启动 (:3000)
npm run dev:admin      # 验证前端启动 (:3001)
```

**步骤 4.5**：测试验证
```bash
npm run lint           # 所有子项目 lint
npm run format:check   # 格式检查
npm run test:server    # 后端单元测试
```

### 阶段 5：文档编写

创建 `docs/` 下的中文文档：

- `docs/architecture.md` — 系统架构说明、模块职责、数据流图、目录结构说明
- `docs/development.md` — 开发环境搭建、快速开始、工作流、常见问题
- `docs/deployment.md` — 生产构建、环境变量、Docker 部署（可选）、Nginx 反向代理
- `CONTRIBUTING.md` — Commit 规范（Conventional Commits）、分支命名、PR 流程、Code Review 检查清单

---

## 关键设计决策

### 1. 为什么选 npm workspaces 而不是 Turborepo/Nx？

- 项目规模适中（2 个 app + 1 个 shared 包），npm workspaces 足够
- 无额外学习成本和工具链依赖
- npm 原生支持，团队无需安装新工具

### 2. 共享类型包使用 `paths` 而非编译后引用

- 开发时：`tsconfig paths` 直接指向 `packages/shared/src/`，无需先编译
- 生产时：`packages/shared` 编译为 `dist/`，`main`/`types` 字段指向编译产物
- 好处：开发体验流畅，修改共享类型立即生效

### 3. ESLint 不强制统一版本

- 后端：ESLint 8 + `@typescript-eslint` v7（NestJS 生态标准）
- 前端：ESLint 9 + flat config（Next.js 16 推荐）
- 共享配置 `tools/eslint-config` 仅用于后端，前端继续使用 `eslint-config-next`

### 4. Role 枚举改为 `const` 对象

```typescript
// 之前（TypeScript enum，编译为运行时对象，CJS/ESM 行为不一致）
export enum Role { SUPER_ADMIN = 'super_admin', ... }

// 之后（const 对象 + type union，兼容 CJS 和 ESM）
export const Role = {
  SUPER_ADMIN: 'super_admin',
  ENTERPRISE_ADMIN: 'enterprise_admin',
  USER: 'user',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
```

### 5. `.env` 文件位置

- 保持在 monorepo 根目录，方便前后端共享
- NestJS `ConfigModule` 配置 `envFilePath: ['.env', '../../.env']` 兼容开发和生产路径

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 移动大量文件导致导入路径错误 | 分阶段移动，每阶段验证 `tsc --noEmit` |
| 嵌套 git 仓库历史丢失 | 如需要保留历史，可用 `git subtree` 合并 |
| npm workspaces hoisting 冲突 | 当前两端无版本冲突的依赖，如遇冲突可用 `--install-strategy=nested` |
| 路径别名 `@/*` 与 `@nestjs-sso/shared` 混用 | 各 workspace 独立 tsconfig，互不干扰 |
| 构建顺序依赖 | 共享包 `paths` 映射使开发时无需构建，生产构建按 shared → server → admin 顺序 |

---

## 验证计划

1. **编译验证**：`npm run build` 全部三个子包编译通过
2. **后端启动**：`npm run dev:server` → `curl http://localhost:3000/health` 返回 `{"status":"ok"}`
3. **前端启动**：`npm run dev:admin` → 浏览器访问 `http://localhost:3001/login` 正常渲染
4. **API 测试**：超级管理员登录 → 企业列表 → 企业管理员登录 → 用户隔离验证
5. **Lint 检查**：`npm run lint` 无错误
6. **格式检查**：`npm run format:check` 通过