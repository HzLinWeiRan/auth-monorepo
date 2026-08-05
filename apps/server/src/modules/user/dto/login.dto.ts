import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * 登录入参（供认证中心登录接口与 SP 代认证使用）。
 */
export class LoginDto {
  @ApiProperty({ example: 'alice', description: '用户名' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @ApiProperty({ example: 'Str0ng@Pass', description: '密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}
