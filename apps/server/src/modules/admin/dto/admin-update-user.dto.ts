import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MaxLength, IsIn } from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'zhangsan@example.com', description: '邮箱' })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ example: 'active', description: '状态：active / disabled' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'disabled'])
  status?: string;

  @ApiPropertyOptional({ example: 'enterprise_admin', description: '角色' })
  @IsOptional()
  @IsString()
  @IsIn(['enterprise_admin', 'user'])
  roles?: string;
}