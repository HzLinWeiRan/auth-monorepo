# 部署指南

## 生产构建

### 1. 构建所有子项目

```bash
# 安装依赖
npm ci --production

# 构建共享包
npm run build:shared

# 构建后端
npm run build:server

# 构建前端
npm run build:admin
```

### 2. 生产环境变量

创建 `.env` 文件，覆盖默认配置：

```env
# 服务端口
PORT=3000

# JWT 密钥（生产环境务必更换为强随机字符串）
JWT_SECRET=<生成强随机字符串>

# 数据库（生产环境推荐 PostgreSQL）
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=sso_user
DATABASE_PASSWORD=<数据库密码>
DATABASE_DATABASE=sso_production

# API 前缀
API_PREFIX=api/v1

# 访问令牌有效期（秒）
JWT_ACCESS_EXPIRES_IN=900

# 刷新令牌有效期（秒）
JWT_REFRESH_EXPIRES_IN=604800
```

#### 生成安全密钥

```bash
# JWT 密钥
openssl rand -base64 64

# 数据库密码
openssl rand -base64 32
```

### 3. 启动服务

**后端**：

```bash
NODE_ENV=production node apps/server/dist/main.js
```

**前端**（Next.js standalone 模式）：

```bash
cd apps/admin-web && npm run start
```

### 4. 端口说明

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| NestJS 后端 | 3000 | OAuth 2.0 / OIDC 端点 + API |
| Next.js 前端 | 3001 | 管理后台界面 |

## 部署方式

### 方式一：Node.js 进程 + Nginx 反向代理

```nginx
# /etc/nginx/sites-available/sso
server {
    listen 80;
    server_name sso.example.com;

    # 管理后台
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSO API + OAuth 端点
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /oauth/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /.well-known/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    location /sp/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

### 方式二：PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
pm2 start apps/server/dist/main.js \
  --name sso-server \
  --env production

# 启动前端
pm2 start node_modules/.bin/next \
  --name sso-admin \
  -- start \
  --cwd apps/admin-web

# 保存配置
pm2 save

# 开机自启
pm2 startup
```

### 方式三：Docker 部署

**Dockerfile**（后端）：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/
RUN npm ci && npm run build:shared && npm run build:server

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY .env ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**docker-compose.yml**：

```yaml
version: '3.8'
services:
  sso-server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=postgres
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USERNAME=sso_user
      - DATABASE_PASSWORD=${DB_PASSWORD}
      - DATABASE_DATABASE=sso
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sso_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: sso
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## 检查清单

部署前确认：

- [ ] `.env` 生产配置已就绪（JWT_SECRET 已更换）
- [ ] 数据库已创建（PostgreSQL/MySQL）或 SQLite 文件路径正确
- [ ] 管理员账号已初始化（种子数据）
- [ ] HTTPS 证书已配置（生产环境必须使用 HTTPS）
- [ ] Nginx 反向代理配置正确
- [ ] 防火墙已开放必要端口（80/443）
- [ ] OIDC Discovery 端点可访问：`https://<domain>/.well-known/openid-configuration`
- [ ] 日志目录已配置并有写入权限

## 监控与运维

### 健康检查

```bash
curl http://localhost:3000/health
# 返回: {"status":"ok","timestamp":"..."}
```

### 日志

NestJS 默认输出到标准输出。生产环境建议配置日志收集：

- 使用 PM2 日志管理：`pm2 logs sso-server`
- 或接入 ELK / Loki 等日志平台

### 数据库备份

```bash
# SQLite
cp sso.sqlite "sso_backup_$(date +%Y%m%d).sqlite"

# PostgreSQL
pg_dump -U sso_user sso > "sso_backup_$(date +%Y%m%d).sql"
```

### 性能建议

- 启用 Nginx gzip 压缩
- 配置 CDN 缓存静态资源（前端）
- 数据库连接池调优（TypeORM `extra.max` 配置）
- 考虑使用 Redis 缓存会话和令牌