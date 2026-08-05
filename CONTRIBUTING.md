# 贡献指南

## 代码规范

### 编辑器配置

项目根目录包含 `.editorconfig`，确保所有开发者使用统一的编辑器设置：

- 缩进：2 空格
- 换行符：LF
- 字符集：UTF-8
- 文件末尾插入空行

建议安装 EditorConfig 插件（IDE 通常自带支持）。

### 代码格式化

使用 Prettier 统一格式化。配置文件：`.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

使用方式：

```bash
npm run format        # 格式化所有代码
npm run format:check  # 仅检查格式
```

### TypeScript 规范

- 使用 `const` 对象 + type union 替代 `enum`（兼容 CJS/ESM）
- 接口命名使用 PascalCase，类型文件使用 `kebab-case.ts`
- 导出类型优先使用 `interface`，需要联合类型时使用 `type`
- 避免使用 `any`，必要时使用 `unknown` 并做类型守卫

### NestJS 规范

- Controller 文件：`*.controller.ts`
- Service 文件：`*.service.ts`
- Entity 文件：`*.entity.ts`
- DTO 文件：`*.dto.ts`
- Module 文件：`*.module.ts`
- 所有接口必须使用 Swagger 装饰器编写文档

### Next.js 规范

- 页面组件使用默认导出
- 工具函数使用命名导出
- 使用 App Router 和 Server Components
- 客户端组件添加 `'use client'` 指令

## Commit 规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（类型）

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（既非新功能也非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或外部依赖变更 |
| `ci` | CI 配置变更 |
| `chore` | 其他杂项 |

### Scope（范围）

| 范围 | 说明 |
|------|------|
| `server` | 后端服务 |
| `admin-web` | 管理后台前端 |
| `shared` | 共享类型包 |
| `oauth` | OAuth 2.0 / OIDC 相关 |
| `enterprise` | 多租户相关 |
| `auth` | 认证相关 |
| `docs` | 文档 |

### 示例

```bash
# 新功能
feat(oauth): add PKCE support for authorization code flow

# Bug 修复
fix(server): resolve better-sqlite3 bindings error in webpack build

# 文档
docs(shared): add JSDoc comments to all exported types

# 重构
refactor(admin-web): extract API client into shared lib module

# 样式
style(server): apply consistent naming to DTO files

# 测试
test(oauth): add integration tests for token endpoint

# 构建
build: migrate to npm workspaces monorepo structure
```

### Git 分支命名

```
feature/<描述>     # 新功能分支
fix/<描述>         # Bug 修复分支
refactor/<描述>    # 重构分支
docs/<描述>        # 文档分支
```

示例：

```
feature/oauth-pkce
fix/sqlite-bindings-error
refactor/monorepo-structure
docs/api-reference
```

## Pull Request 流程

1. 从 `main` 分支创建功能分支
2. 开发和测试完成后，提交 PR
3. PR 标题遵循 Commit 规范格式
4. PR 描述包含：
   - 变更摘要
   - 测试计划
   - 关联 Issue（如有）

### PR 模板

```markdown
## 变更摘要

简要描述本次变更内容。

## 测试计划

- [ ] 单元测试通过
- [ ] 构建无错误
- [ ] 本地启动验证通过
- [ ] 相关 API 端点测试通过

## 关联 Issue

Closes #<issue-number>
```

## Code Review 检查清单

审查者确认：

- [ ] 代码风格符合项目规范
- [ ] TypeScript 类型定义完整且正确
- [ ] 接口文档（Swagger 装饰器）已更新
- [ ] 共享类型变更已同步到 `packages/shared`
- [ ] 错误处理完整（不吞异常）
- [ ] 无安全风险（SQL 注入、XSS、敏感信息泄露）
- [ ] 测试覆盖充分
- [ ] 构建和启动未受影响

## 开发环境设置

### VS Code 推荐插件

- ESLint
- Prettier
- EditorConfig
- Thunder Client（API 测试）

### VS Code 配置

`.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```