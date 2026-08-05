# OAuth 2.0 / OIDC 标准重构计划

## Context

当前 SSO 系统使用自定义协议（`/sso/authorize` + Ticket 换票），不符合 OAuth 2.0 和 OpenID Connect 标准。第三方 SP 无法使用标准 OAuth 库（如 `passport-oauth2`、`openid-client`）接入，需要重构为标准 OAuth 2.0 Authorization Code Flow + PKCE + OIDC。

核心变更：
- 自定义 Ticket 换票 → 标准 Authorization Code 换取 Token
- 新增 `id_token`（OIDC）、Token Introspection（RFC 7662）、Token Revocation（RFC 7009）、RP-Initiated Logout
- 新增 `/.well-known/openid-configuration` 发现端点
- 旧端点保留兼容，标记 deprecated

---

## 阶段 1：基础设施（实体 + DTO + 配置）

### 1.1 新建 AuthorizationCode 实体
**文件**: `src/modules/auth/authorization-code.entity.ts`

```
code: string (unique indexed)
clientId: string (indexed)
userId: string
redirectUri: string
scopes: string (JSON text)
expiresAt: Date
used: boolean (default false)
codeChallenge: string | null
codeChallengeMethod: string | null ('S256' | 'plain')
nonce: string | null
createdAt: Date
```

### 1.2 新建 RefreshToken 实体（支持 rotation）
**文件**: `src/modules/auth/refresh-token.entity.ts`

```
id: uuid (PK)
tokenHash: string (unique indexed) -- SHA-256 hash of refresh token JWT
clientId: string
userId: string
sessionId: string
scopes: string (JSON text)
expiresAt: Date
used: boolean (default false)
family: string (token family UUID for rotation reuse detection)
createdAt: Date
```

### 1.3 扩展 App 实体
**文件**: `src/modules/app/app.entity.ts`

新增字段（全部 nullable，向后兼容）：
```
scopes: text (JSON, default '["openid","profile","email"]')
grant_types: text (JSON, default '["authorization_code","refresh_token"]')
redirect_uris: text (JSON) -- 多回调地址
application_type: varchar(16, default 'web')
token_endpoint_auth_method: varchar(32, default 'client_secret_post')
post_logout_redirect_uris: text (JSON)
```

### 1.4 扩展 CreateAppDto
**文件**: `src/modules/app/dto/create-app.dto.ts`

新增 `@ApiPropertyOptional` 字段：`scopes`、`grant_types`、`redirectUris`、`applicationType`、`tokenEndpointAuthMethod`、`postLogoutRedirectUris`

### 1.5 新建 OAuth DTOs
**目录**: `src/modules/auth/dto/oauth/`

- `authorization-request.dto.ts` — `response_type`、`client_id`、`redirect_uri`、`scope`、`state`、`code_challenge`、`code_challenge_method`、`nonce`
- `token-request.dto.ts` — `grant_type`、`code`、`redirect_uri`、`client_id`、`client_secret`、`code_verifier`、`refresh_token`
- `token-response.dto.ts` — `access_token`、`token_type`、`expires_in`、`refresh_token`、`id_token`、`scope`
- `introspection-request.dto.ts` — `token`、`token_type_hint`
- `introspection-response.dto.ts` — `active`、`scope`、`client_id`、`username`、`sub`、`exp`、`iat`
- `revocation-request.dto.ts` — `token`、`token_type_hint`、`client_id`、`client_secret`
- `userinfo-response.dto.ts` — `sub`、`name`、`preferred_username`、`email`、`email_verified`

### 1.6 扩展配置
**文件**: `src/config/configuration.ts`、`.env`、`.env.example`

新增配置项：
```
ISSUER=http://localhost:3000
AUTHORIZATION_CODE_TTL_MS=60000
ID_TOKEN_EXPIRES_IN=1h
```

### 1.7 注册新实体
**文件**: `src/app.module.ts`

`entities` 数组新增 `AuthorizationCode`、`RefreshToken`

---

## 阶段 2：核心服务层

### 2.1 新建 AuthorizationCodeService
**文件**: `src/modules/auth/authorization-code.service.ts`

- `create(params: { clientId, userId, redirectUri, scopes, codeChallenge, codeChallengeMethod, nonce, ttlMs })` — 生成随机 code，存储实体
- `consume(code, clientId, redirectUri, codeVerifier?)` — 校验（存在性、未使用、未过期、client 匹配、redirectUri 匹配、PKCE 校验），标记 used，返回 `{ userId, scopes, nonce }`
- `invalidateByUser(userId)` — SLO 时失效所有 codes
- **PKCE 校验**：S256 → `BASE64URL(SHA256(code_verifier)) === code_challenge`；plain → 直接比较

### 2.2 新建 RefreshTokenService
**文件**: `src/modules/auth/refresh-token.service.ts`

- `create(params: { clientId, userId, sessionId, scopes, ttlMs })` — 签发 refresh_token JWT，存储 hash
- `rotate(token, clientId)` — 校验 token → 标记旧 token 为 used → 检查 family 防重用（同一 family 出现 used token → 整个 family 失效）→ 签发新 token
- `revokeByUser(userId)` — 失效所有
- `revokeByToken(token)` — 失效单个

### 2.3 扩展 AuthService
**文件**: `src/modules/auth/auth.service.ts`

新增方法：

- `authorize(params)` — 校验 client_id、redirect_uri、scope → 检测全局会话 → 未登录跳登录页 / 已登录签发 authorization code
- `token(params)` — 统一入口，按 grant_type 分发
- `exchangeAuthorizationCode(params)` — 消费 code → 查用户 → 签发 access_token + refresh_token + id_token
- `buildIdToken(user, clientId, nonce, authTime)` — 构造 id_token JWT（含 `iss`、`sub`、`aud`、`exp`、`iat`、`auth_time`、`nonce`、`at_hash`、`c_hash`）
- `buildUserInfo(user, scopes)` — 按 scope 返回 claims
- `introspect(token)` — decode token → 查会话 → 返回 active + meta
- `revoke(token, clientId)` — 吊销 refresh_token
- `endSession(idTokenHint, postLogoutRedirectUri, state)` — 验证 id_token → 失效会话 → 广播 SLO → 302

---

## 阶段 3：OAuth 控制器

### 3.1 新建 OAuthController（浏览器端点，无前缀）
**文件**: `src/modules/auth/oauth.controller.ts`

```
@Controller('oauth')
GET  /oauth/authorize   — 接收 OAuth 2.0 标准参数，校验 → 已登录签发 code 302 / 未登录跳登录页
GET  /oauth/login       — 渲染登录页（复用 SsoController 的 login.html）
POST /oauth/login       — 提交登录表单，写 Cookie 后回跳 /oauth/authorize
GET  /oauth/endsession  — OIDC RP-Initiated Logout
```

### 3.2 新建 TokenController（API 端点，带前缀）
**文件**: `src/modules/auth/token.controller.ts`

```
@Controller('oauth')
POST /api/v1/oauth/token       — grant_type=authorization_code | refresh_token
POST /api/v1/oauth/introspect  — RFC 7662
POST /api/v1/oauth/revoke      — RFC 7009
GET  /api/v1/oauth/userinfo    — OIDC UserInfo（Bearer auth）
```

### 3.3 新建 DiscoveryController
**文件**: `src/modules/auth/discovery.controller.ts`

```
@Controller('.well-known')
GET /.well-known/openid-configuration — OIDC Discovery 元数据
```

### 3.4 更新 AuthModule
**文件**: `src/modules/auth/auth.module.ts`

- `TypeOrmModule.forFeature` 新增 `AuthorizationCode`、`RefreshToken`
- `providers` 新增 `AuthorizationCodeService`、`RefreshTokenService`
- `controllers` 新增 `OAuthController`、`TokenController`、`DiscoveryController`
- `exports` 新增 `AuthorizationCodeService`、`RefreshTokenService`

### 3.5 更新 main.ts
**文件**: `src/main.ts`

`setGlobalPrefix` exclude 新增 `oauth/authorize`、`oauth/login`、`oauth/endsession`、`.well-known/openid-configuration`

---

## 阶段 4：Demo SP 迁移

### 4.1 重写 DemoSpController
**文件**: `src/modules/demo-sp/demo-sp.controller.ts`

- `/sp` 首页 → 无会话时 redirect 到 `/oauth/authorize?response_type=code&client_id=demo-sp&scope=openid+profile+email&code_challenge=...&code_challenge_method=S256&state=...&nonce=...`
- `/sp/callback` → 接收 `code` → `POST /api/v1/oauth/token`（grant_type=authorization_code）→ 存储 `access_token`/`id_token` 到 Cookie
- `/sp/logout` → redirect 到 `/oauth/endsession?id_token_hint={id_token}&post_logout_redirect_uri=...`
- `onModuleInit` → `ensureApp` 传入 `redirectUris`、`postLogoutRedirectUris`、`scopes`、`grantTypes`

---

## 阶段 5：向后兼容

- 保留 `SsoController`（`/sso/authorize`、`/sso/login`）和 `AuthController` 旧端点，标记 deprecated
- 保留 `Ticket` 实体和 `TicketService`，不做修改
- 旧 Demo SP 可以继续使用旧流程
- README 添加迁移指南

---

## 路由架构总览

| 端点 | 认证 | 前缀 | 说明 |
|------|------|------|------|
| `GET /oauth/authorize` | 公开 | 无 | OAuth 2.0 授权端点 |
| `GET /oauth/login` | 公开 | 无 | 登录页 |
| `POST /oauth/login` | 公开 | 无 | 登录表单 |
| `GET /oauth/endsession` | 公开 | 无 | OIDC 登出 |
| `POST /api/v1/oauth/token` | 公开 | `/api/v1` | Token 端点 |
| `POST /api/v1/oauth/introspect` | 公开 | `/api/v1` | RFC 7662 |
| `POST /api/v1/oauth/revoke` | 公开 | `/api/v1` | RFC 7009 |
| `GET /api/v1/oauth/userinfo` | Bearer | `/api/v1` | OIDC UserInfo |
| `GET /.well-known/openid-configuration` | 公开 | 无 | Discovery |
| `GET /.well-known/jwks.json` | 公开 | 无 | 保持不变 |

---

## 文件变更清单

| 操作 | 文件 |
|------|------|
| 新建 | `src/modules/auth/authorization-code.entity.ts` |
| 新建 | `src/modules/auth/refresh-token.entity.ts` |
| 新建 | `src/modules/auth/authorization-code.service.ts` |
| 新建 | `src/modules/auth/refresh-token.service.ts` |
| 新建 | `src/modules/auth/oauth.controller.ts` |
| 新建 | `src/modules/auth/token.controller.ts` |
| 新建 | `src/modules/auth/discovery.controller.ts` |
| 新建 | `src/modules/auth/dto/oauth/authorization-request.dto.ts` |
| 新建 | `src/modules/auth/dto/oauth/token-request.dto.ts` |
| 新建 | `src/modules/auth/dto/oauth/token-response.dto.ts` |
| 新建 | `src/modules/auth/dto/oauth/introspection-request.dto.ts` |
| 新建 | `src/modules/auth/dto/oauth/introspection-response.dto.ts` |
| 新建 | `src/modules/auth/dto/oauth/revocation-request.dto.ts` |
| 新建 | `src/modules/auth/dto/oauth/userinfo-response.dto.ts` |
| 修改 | `src/modules/app/app.entity.ts` |
| 修改 | `src/modules/app/app.service.ts` |
| 修改 | `src/modules/app/dto/create-app.dto.ts` |
| 修改 | `src/modules/auth/auth.service.ts` |
| 修改 | `src/modules/auth/auth.module.ts` |
| 修改 | `src/modules/demo-sp/demo-sp.controller.ts` |
| 修改 | `src/app.module.ts` |
| 修改 | `src/main.ts` |
| 修改 | `src/config/configuration.ts` |
| 修改 | `.env` |
| 修改 | `.env.example` |

---

## Verification

1. `npx tsc --noEmit` — 编译通过
2. 启动服务 → 访问 `http://localhost:3000/.well-known/openid-configuration` → 返回标准 OIDC Discovery 文档
3. 访问 `http://localhost:3000/sp` → 302 到 `/oauth/authorize?response_type=code&...` → 登录页 → 登录后回调 `/sp/callback?code=xxx` → 成功渲染 SP 首页
4. 使用 `curl` 测试 `POST /api/v1/oauth/token`（authorization_code + refresh_token grant）
5. 旧端点 `/sso/authorize` 仍可正常工作
6. Swagger 文档 `/docs` 展示所有新端点及字段描述