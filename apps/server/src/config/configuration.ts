/**
 * 全局配置加载器：读取 .env 并归一化为结构化配置对象。
 * 通过 @nestjs/config 的 ConfigModule 注入，使用时注入 ConfigService 即可。
 */
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  /** OAuth 2.0 / OIDC Issuer 标识（用于 id_token 的 iss claim） */
  issuer: process.env.ISSUER || `http://localhost:${parseInt(process.env.PORT, 10) || 3000}`,
  database: {
    // 默认使用 better-sqlite3（纯预编译二进制，免本地编译）；可切换 postgres/mysql
    type: (process.env.DB_TYPE || 'better-sqlite3') as
      | 'better-sqlite3'
      | 'postgres'
      | 'mysql',
    database: process.env.DB_DATABASE || './sso.sqlite',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-please-change',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    /** id_token 有效期 */
    idTokenExpiresIn: process.env.ID_TOKEN_EXPIRES_IN || '1h',
  },
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    domain: process.env.COOKIE_DOMAIN || 'localhost',
  },
  session: {
    // 全局会话有效期（毫秒）
    ttlMs: parseInt(process.env.SESSION_TTL_MS, 10) || 86400000,
  },
  ticket: {
    // 票据有效期（毫秒）
    ttlMs: parseInt(process.env.TICKET_TTL_MS, 10) || 60000,
  },
  oauth: {
    /** OAuth 2.0 Authorization Code 有效期（毫秒） */
    authorizationCodeTtlMs: parseInt(process.env.AUTHORIZATION_CODE_TTL_MS, 10) || 60000,
  },
  /** 每个企业最多可创建的应用数量 */
  appLimitPerEnterprise: parseInt(process.env.APP_LIMIT_PER_ENTERPRISE, 10) || 10,
});
