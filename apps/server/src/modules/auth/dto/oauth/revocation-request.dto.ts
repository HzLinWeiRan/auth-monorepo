import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Token Revocation 请求（RFC 7009 §2.1）。
 */
export class RevocationRequestDto {
  @ApiProperty({
    description: '待吊销的 Token（access_token 或 refresh_token）',
    example: 'eyJhbGciOi...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'OAuth 客户端标识，用于认证',
    example: 'demo-sp',
  })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({
    description: 'OAuth 客户端密钥',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  client_secret: string;
}