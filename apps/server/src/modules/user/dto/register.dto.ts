import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * 用户注册入参。
 */
export class RegisterDto {
  @ApiProperty({ example: 'alice', description: '用户名（3-32 位）' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @ApiProperty({ example: 'Str0ng@Pass', description: '密码（至少 6 位）' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;

  @ApiPropertyOptional({ example: 'alice@example.com', description: '邮箱' })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({
    example: 'my-app-id',
    description: '应用 ID（client_id），通过应用关联到对应企业',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  appId?: string;
}
