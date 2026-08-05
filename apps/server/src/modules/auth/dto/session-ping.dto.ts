import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 会话探活请求：SP 定时发送以确认全局会话是否仍然有效。
 * 仅校验会话存在性，不查用户信息，比 /auth/validate 轻量。
 */
export class SessionPingDto {
  @ApiProperty({
    description: '全局会话标识',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
