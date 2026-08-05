import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 提取当前登录用户（由 JwtStrategy.validate 挂载到 request.user）。
 * 用法：@CurrentUser() user: { id: string; username: string; sessionId?: string }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
