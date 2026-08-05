import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

/**
 * OAuth 2.0 Authorization Request 参数（GET /oauth/authorize）。
 * 符合 RFC 6749 §4.1.1 + PKCE (RFC 7636) + OIDC nonce。
 */
export class AuthorizationRequestDto {
  @ApiProperty({
    description: '授权类型，固定为 "code"（Authorization Code Flow）',
    example: 'code',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['code'])
  response_type: string;

  @ApiProperty({
    description: 'OAuth 客户端标识（appId）',
    example: 'demo-sp',
  })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({
    description: '授权成功后的回调地址，须与客户端注册的 redirect_uris 匹配',
    example: 'http://localhost:3000/sp/callback',
  })
  @IsString()
  @IsNotEmpty()
  redirect_uri: string;

  @ApiPropertyOptional({
    description: '请求的作用域（空格分隔），如 "openid profile email"',
    example: 'openid profile email',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: '透传给 SP 的 opaque 状态值，用于防 CSRF',
    example: 'xyz123',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'PKCE code_challenge（S256: SHA-256 哈希后 Base64URL 编码）',
    example: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  })
  @IsOptional()
  @IsString()
  code_challenge?: string;

  @ApiPropertyOptional({
    description: 'PKCE 变换方法：S256（推荐）或 plain',
    example: 'S256',
  })
  @IsOptional()
  @IsString()
  @IsIn(['S256', 'plain'])
  code_challenge_method?: string;

  @ApiPropertyOptional({
    description: 'OIDC nonce（随机字符串，防 id_token 重放）',
    example: 'n-0S6_WzA2Mj',
  })
  @IsOptional()
  @IsString()
  nonce?: string;
}