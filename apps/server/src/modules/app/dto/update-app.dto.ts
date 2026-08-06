import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** 应用更新入参（所有字段可选） */
export class UpdateAppDto {
  @ApiPropertyOptional({ description: '应用名称', example: '订单管理系统 V2' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({
    description: '登录成功后的回调地址',
    example: 'http://localhost:3012/sp/app-a/callback',
  })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'redirectUri 必须是合法 URL' })
  redirectUri?: string;

  @ApiPropertyOptional({
    description: '单点登出（SLO）广播通知回调地址',
    example: 'http://localhost:3012/sp/app-a/slo',
  })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'logoutCallbackUrl 必须是合法 URL' })
  logoutCallbackUrl?: string;

  @ApiPropertyOptional({
    description: '应用 Logo URL',
    example: 'https://myapp.com/logo.png',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: '品牌主色（Hex），如 #2563EB',
    example: '#1a73e8',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  primaryColor?: string;
}