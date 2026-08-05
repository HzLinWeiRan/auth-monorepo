import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * 角色装饰器：指定接口所需的最小角色。
 * super_admin 自动通过所有角色检查。
 *
 * @example @Roles(Role.SUPER_ADMIN)
 * @example @Roles(Role.ENTERPRISE_ADMIN)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);