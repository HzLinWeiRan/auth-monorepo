/**
 * 系统角色常量。
 * 使用 const 对象 + type union 替代 TypeScript enum，
 * 确保 CommonJS（后端）和 ESM（前端）兼容。
 *
 * - SUPER_ADMIN: 平台超级管理员，可管理所有企业
 * - ENTERPRISE_ADMIN: 企业管理员，仅管理本企业内的用户与应用
 * - USER: 普通用户，无管理后台权限，仅用于 SSO 登录
 */
export const Role = {
  SUPER_ADMIN: 'super_admin',
  ENTERPRISE_ADMIN: 'enterprise_admin',
  USER: 'user',
} as const;

export type Role = (typeof Role)[keyof typeof Role];