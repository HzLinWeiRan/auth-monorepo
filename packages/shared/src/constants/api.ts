/** API 前缀 */
export const API_PREFIX = 'api/v1';

/** API 端点常量 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VALIDATE: '/auth/validate',
    SESSION_PING: '/auth/session/ping',
  },
  USERS: {
    REGISTER: '/users/register',
    PROFILE: '/users/profile',
  },
  APPS: {
    BASE: '/apps',
  },
  ADMIN: {
    LOGIN: '/admin/login',
    ME: '/admin/me',
    OVERVIEW: '/admin/overview',
    ENTERPRISE_USERS: '/admin/enterprise/users',
    ENTERPRISE_APPS: '/admin/enterprise/apps',
  },
  ENTERPRISES: {
    BASE: '/enterprises',
  },
  OAUTH: {
    AUTHORIZE: '/oauth/authorize',
    TOKEN: '/oauth/token',
    USERINFO: '/oauth/userinfo',
    INTROSPECT: '/oauth/introspect',
    REVOKE: '/oauth/revoke',
    ENDSESSION: '/oauth/endsession',
  },
  OIDC: {
    DISCOVERY: '/.well-known/openid-configuration',
    JWKS: '/.well-known/jwks.json',
  },
  HEALTH: '/health',
} as const;