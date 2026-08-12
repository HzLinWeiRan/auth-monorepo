import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsArray,
  IsIn,
  MaxLength,
} from 'class-validator';

/** SP 应用注册入参（OAuth 2.0 Client） */
export class CreateAppDto {
  @ApiProperty({ description: '应用名称', example: '订单管理系统' })
  @IsString()
  @IsNotEmpty({ message: '应用名称不能为空' })
  @MaxLength(128)
  name: string;

  @ApiProperty({
    description: '登录成功后的回调地址（OAuth 2.0 redirect_uri）',
    example: 'http://localhost:3012/sp/app-a/callback',
  })
  @IsUrl({ require_tld: false }, { message: 'redirectUri 必须是合法 URL' })
  redirectUri: string;

  @ApiPropertyOptional({
    description: '单点登出（SLO）广播通知回调地址',
    example: 'http://localhost:3012/sp/app-a/slo',
  })
  @IsOptional()
  @IsUrl(
    { require_tld: false },
    { message: 'logoutCallbackUrl 必须是合法 URL' },
  )
  logoutCallbackUrl?: string;

  @ApiPropertyOptional({
    description: 'OAuth 2.0 多回调地址列表（JSON 数组，优先于 redirectUri）',
    example:
      '["http://localhost:3012/callback","http://localhost:3012/callback2"]',
  })
  @IsOptional()
  @IsString()
  redirectUris?: string;

  @ApiPropertyOptional({
    description: 'OAuth 2.0 允许的 grant_types（JSON 数组）',
    example: '["authorization_code","refresh_token"]',
  })
  @IsOptional()
  @IsString()
  grantTypes?: string;

  @ApiPropertyOptional({
    description: 'OAuth 2.0 允许的 scopes（JSON 数组）',
    example: '["openid","profile","email"]',
  })
  @IsOptional()
  @IsString()
  scopes?: string;

  @ApiPropertyOptional({
    description: '应用类型：web 或 native',
    example: 'web',
    default: 'web',
  })
  @IsOptional()
  @IsString()
  @IsIn(['web', 'native'])
  applicationType?: string;

  @ApiPropertyOptional({
    description: 'Token 端点认证方式',
    example: 'client_secret_post',
    default: 'client_secret_post',
  })
  @IsOptional()
  @IsString()
  @IsIn(['client_secret_post', 'client_secret_basic'])
  tokenEndpointAuthMethod?: string;

  @ApiPropertyOptional({
    description: 'OIDC RP-Initiated Logout 允许的回调地址（JSON 数组）',
    example: '["http://localhost:3012/"]',
  })
  @IsOptional()
  @IsString()
  postLogoutRedirectUris?: string;

  @ApiPropertyOptional({
    description: '应用 Logo URL（展示在登录页左上角），为空则使用默认图标',
    example: 'https://myapp.com/logo.png',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: '品牌主色（Hex），如 #2563EB。为空则使用默认蓝色',
    example: '#1a73e8',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  primaryColor?: string;
}
