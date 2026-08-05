import { SetMetadata } from '@nestjs/common';

/**
 * 标记接口为「公开接口」，JwtAuthGuard / 其它全局守卫可据此跳过鉴权。
 * 用法：@Public() @Get('login') ...
 */
export const IS_PUBLIC_KEY = 'isPublic';

export function Public(): MethodDecorator {
  return SetMetadata(IS_PUBLIC_KEY, true);
}
