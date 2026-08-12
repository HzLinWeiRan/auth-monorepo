/**
 * 系统角色枚举。
 * 从 @nestjs-sso/shared 重新导出，确保前后端角色定义一致。
 *
 * - SUPER_ADMIN: 平台超级管理员，可管理所有企业
 * - ENTERPRISE_ADMIN: 企业管理员，仅管理本企业内的用户与应用
 * - USER: 普通用户，无管理后台权限，仅用于 SSO 登录
 */
export { Role } from '@nestjs-sso/shared';
