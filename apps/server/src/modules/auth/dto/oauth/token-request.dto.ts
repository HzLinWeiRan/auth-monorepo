import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

/**
 * OAuth 2.0 Token Request 参数（POST /oauth/token）。
 * 支持 authorization_code 和 refresh_token 两种 grant_type。
 */
export class TokenRequestDto {
  @ApiProperty({
    description: '授权类型：authorization_code 或 refresh_token',
    example: 'authorization_code',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['authorization_code', 'refresh_token'])
  grant_type: string;

  @ApiPropertyOptional({
    description: '授权码（grant_type=authorization_code 时必填）',
    example: 'a1b2c3d4e5f6g7h8...',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: '回调地址（grant_type=authorization_code 时必填，须与授权请求一致）',
    example: 'http://localhost:3000/sp/callback',
  })
  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @ApiProperty({ description: 'OAuth 客户端标识', example: 'demo-sp' })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiPropertyOptional({
    description: 'OAuth 客户端密钥（client_secret_post 认证方式）',
    example: 'abc123...',
  })
  @IsOptional()
  @IsString()
  client_secret: string;

  @ApiPropertyOptional({
    description: 'PKCE code_verifier（授权时使用了 code_challenge 则必填）',
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  })
  @IsOptional()
  @IsString()
  code_verifier?: string;

  @ApiPropertyOptional({
    description: 'Refresh Token（grant_type=refresh_token 时必填）',
    example: 'eyJhbGciOi...',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}