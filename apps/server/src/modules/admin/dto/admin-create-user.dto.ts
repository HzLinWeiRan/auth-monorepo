import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator';

export class AdminCreateUserDto {
  @ApiProperty({ example: 'zhangsan', description: '用户名' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @ApiProperty({ example: 'Str0ng@Pass', description: '密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com', description: '邮箱' })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ example: 'enterprise_admin', description: '角色：enterprise_admin / user', default: 'user' })
  @IsOptional()
  @IsString()
  @IsIn(['enterprise_admin', 'user'])
  roles?: string;
}