# 开发指南

## 环境要求

- **Node.js** ≥ 18.0.0（推荐 20.x）
- **npm** ≥ 9.0.0
- Git

## 快速开始

### 1. 克隆仓库

```bash
git clone <repo-url>
cd nestjs-sso
```

### 2. 安装依赖

npm workspaces 会自动安装所有子项目的依赖，并建立 workspace 符号链接。

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env  # 如无 .env.example，参考 apps/server/.env.example
```

默认 `.env` 配置（开发环境可开箱即用）：

```env
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
API_PREFIX=api/v1
DATABASE_TYPE=better-sqlite3
DATABASE_DATABASE=./sso.sqlite
```

### 4. 构建共享包

```bash
npm run build:shared
```

### 5. 启动开发服务

**后端**（端口 3000）：

```bash
npm run dev:server
```

**前端**（端口 3001）：

```bash
npm run dev:admin
```

### 6. 访问地址

| 服务 | 地址 |
|------|------|
| 后端 API | <http://localhost:3000> |
| Swagger 文档 | <http://localhost:3000/docs> |
| 管理后台 | <http://localhost:3001> |
| 演示 SP | <http://localhost:3000/sp> |
| OIDC Discovery | <http://localhost:3000/.well-known/openid-configuration> |

### 7. 测试账号

种子数据自动初始化以下账号：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `Admin@123` | 超级管理员 |
| `entadmin` | `Admin@123` | 企业管理员 |
| `demo` | `demo123` | 普通用户 |

## 开发工作流

### 常用命令

```bash
# === 构建 ===
npm run build            # 构建所有子项目
npm run build:shared     # 仅构建共享包
npm run build:server     # 仅构建后端
npm run build:admin      # 仅构建前端

# === 开发 ===
npm run dev:server       # 启动后端（watch 模式）
npm run dev:admin        # 启动前端（HMR）
npm run dev:shared       # 共享包 watch 模式

# === 测试 ===
npm run test             # 运行所有测试
npm run test:server      # 后端单元测试
npm run test:e2e         # 端到端测试

# === 代码质量 ===
npm run lint             # ESLint 检查
npm run lint:server      # 后端 lint
npm run lint:admin       # 前端 lint
npm run format           # 格式化代码
npm run format:check     # 检查格式

# === 清理 ===
npm run clean            # 清理所有构建产物
```

### 修改共享类型

1. 编辑 `packages/shared/src/types/*.ts` 或 `packages/shared/src/constants/*.ts`
2. 类型变更会立即生效（开发时通过 `paths` 映射直接引用源码）
3. 生产构建前需要 `npm run build:shared`

### 添加新 API 端点

1. 在 `apps/server/src/modules/<module>/` 下创建/修改 Controller
2. 使用 Swagger 装饰器编写接口文档（`@ApiTags`, `@ApiOperation`, `@ApiResponse`）
3. 如需共享类型，在 `packages/shared/src/types/` 添加定义
4. 前端在 `apps/admin-web/src/app/` 下创建对应页面

### 添加新企业/租户

仅超级管理员可创建企业：

```bash
curl -X POST http://localhost:3000/api/v1/enterprises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"name": "新企业", "slug": "new-company"}'
```

## 多租户开发注意事项

### 数据隔离

- 用户注册时自动关联 `enterpriseId`
- 企业管理员只能看到本企业数据
- 超级管理员可以跨企业访问

### 角色检查

在 Controller 中使用 `@Roles()` 装饰器：

```typescript
@Roles(Role.SUPER_ADMIN)
@Post()
async createEnterprise() { ... }

@Roles(Role.ENTERPRISE_ADMIN)
@Get('enterprise/users')
async getEnterpriseUsers() { ... }
```

## 目录约定

| 约定 | 说明 |
|------|------|
| 模块文件 | 每个功能模块独立目录，包含 `*.module.ts`、`*.controller.ts`、`*.service.ts`、`*.entity.ts` |
| DTO 文件 | 放在 `dto/` 子目录，按功能分批（如 `dto/oauth/`） |
| 公共组件 | 放在 `common/` 目录，包含 decorators、filters、guards、strategies |
| 测试文件 | 与源文件同目录，后缀 `.spec.ts`；e2e 测试放在 `test/` 目录 |

## 常见问题

### Q: 修改共享类型后前端报类型错误？

重新构建共享包：`npm run build:shared`

### Q: 后端启动报数据库错误？

删除旧数据库文件重新初始化（开发环境）：

```bash
rm -f sso.sqlite
npm run build:server
npm run dev:server
```

### Q: 端口被占用？

```bash
lsof -ti:3000 | xargs kill -9  # 释放 3000 端口
lsof -ti:3001 | xargs kill -9  # 释放 3001 端口
```

### Q: npm install 后 workspace 链接不生效？

```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: 如何切换到 PostgreSQL？

修改 `.env`：

```env
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_DATABASE=sso
```