import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

/** OAuth 登录页表单提交（浏览器表单，非 JSON API） */
export class SsoLoginDto {
  @ApiProperty({ example: 'alice', description: '用户名' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'Str0ng@Pass', description: '密码' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'OAuth 授权类型，固定为 "code"',
    example: 'code',
  })
  @IsOptional()
  @IsString()
  response_type?: string;

  @ApiPropertyOptional({
    description: '业务系统标识（OAuth client_id）',
    example: 'demo-sp',
  })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional({
    description: '登录成功后的回调地址',
    example: 'http://localhost:3000/sp/callback',
  })
  @IsOptional()
  @IsString()
  redirectUri?: string;

  @ApiPropertyOptional({
    description: '请求的作用域（空格分隔）',
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
    description: 'PKCE code_challenge',
    example: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  })
  @IsOptional()
  @IsString()
  code_challenge?: string;

  @ApiPropertyOptional({
    description: 'PKCE 变换方法：S256 或 plain',
    example: 'S256',
  })
  @IsOptional()
  @IsString()
  code_challenge_method?: string;

  @ApiPropertyOptional({
    description: 'OIDC nonce（随机字符串，防 id_token 重放）',
    example: 'n-0S6_WzA2Mj',
  })
  @IsOptional()
  @IsString()
  nonce?: string;
}
