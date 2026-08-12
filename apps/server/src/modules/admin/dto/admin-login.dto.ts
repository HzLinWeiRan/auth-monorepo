import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin', description: '管理员用户名' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @ApiProperty({ example: 'Admin@123', description: '管理员密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}
