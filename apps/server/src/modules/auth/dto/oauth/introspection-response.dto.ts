import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Token Introspection 响应（RFC 7662 §2.2）。
 */
export class IntrospectionResponseDto {
  @ApiProperty({
    description: 'Token 是否仍然有效',
    example: true,
  })
  active: boolean;

  @ApiPropertyOptional({
    description: 'Token 关联的作用域（空格分隔）',
    example: 'openid profile email',
  })
  scope?: string;

  @ApiPropertyOptional({
    description: 'Token 所属的客户端标识',
    example: 'demo-sp',
  })
  client_id?: string;

  @ApiPropertyOptional({
    description: '资源所有者（用户名）',
    example: 'alice',
  })
  username?: string;

  @ApiPropertyOptional({
    description: '资源所有者唯一标识（sub claim）',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  sub?: string;

  @ApiPropertyOptional({
    description: 'Token 过期时间（Unix 时间戳）',
    example: 1722769200,
  })
  exp?: number;

  @ApiPropertyOptional({
    description: 'Token 签发时间（Unix 时间戳）',
    example: 1722768300,
  })
  iat?: number;
}