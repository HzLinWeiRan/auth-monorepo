import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * OAuth 2.0 Token Response（POST /oauth/token 成功返回）。
 * 符合 RFC 6749 §5.1 + OIDC id_token。
 */
export class TokenResponseDto {
  @ApiProperty({
    description: 'Access Token（JWT，用于访问受保护资源）',
    example: 'eyJhbGciOiJSUzI1NiIs...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Token 类型，固定为 "Bearer"',
    example: 'Bearer',
  })
  token_type: string;

  @ApiProperty({
    description: 'Access Token 有效期（秒）',
    example: 900,
  })
  expires_in: number;

  @ApiPropertyOptional({
    description: 'Refresh Token（JWT，用于换取新的 Access Token）',
    example: 'eyJhbGciOiJSUzI1NiIs...',
  })
  refresh_token?: string;

  @ApiPropertyOptional({
    description: 'ID Token（JWT，OIDC 身份令牌，scope 含 openid 时返回）',
    example: 'eyJhbGciOiJSUzI1NiIs...',
  })
  id_token?: string;

  @ApiProperty({
    description: '实际授予的作用域（空格分隔）',
    example: 'openid profile email',
  })
  scope: string;
}