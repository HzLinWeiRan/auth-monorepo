import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 角色守卫：在 JwtAuthGuard 之后执行，校验当前用户是否具备所需角色。
 * - @Public() 标记的接口直接放行。
 * - 未标记 @Roles() 的接口默认放行（仅需 JWT 登录即可）。
 * - super_admin 自动通过所有角色检查。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 公开接口直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未标记角色要求 → 仅需登录即可
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { roles?: string } | undefined;

    if (!user?.roles) {
      return false;
    }

    const userRoles = user.roles.split(',').map((r) => r.trim());

    // super_admin 拥有所有权限
    if (userRoles.includes(Role.SUPER_ADMIN)) {
      return true;
    }

    // 检查用户是否具备任一所需角色
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
