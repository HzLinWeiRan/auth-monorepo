import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * OIDC UserInfo 响应（OpenID Connect Core 1.0 §5.3）。
 * 按 scope 返回不同 claims：
 *  - openid  → sub
 *  - profile → name, preferred_username, picture
 *  - email   → email, email_verified
 */
export class UserInfoResponseDto {
  @ApiProperty({
    description: '用户唯一标识（sub claim，与 id_token 的 sub 一致）',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  sub: string;

  @ApiPropertyOptional({
    description: '用户全名（scope: profile）',
    example: 'Alice Wang',
  })
  name?: string;

  @ApiPropertyOptional({
    description: '首选用户名（scope: profile）',
    example: 'alice',
  })
  preferred_username?: string;

  @ApiPropertyOptional({
    description: '用户头像 URL（scope: profile）',
  })
  picture?: string;

  @ApiPropertyOptional({
    description: '邮箱地址（scope: email）',
    example: 'alice@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: '邮箱是否已验证（scope: email）',
    example: false,
  })
  email_verified?: boolean;
}
