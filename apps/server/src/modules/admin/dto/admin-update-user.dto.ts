import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'zhangsan@example.com', description: '邮箱' })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ example: true, description: '是否启用用户' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 'enterprise_admin', description: '角色' })
  @IsOptional()
  @IsString()
  @IsIn(['enterprise_admin', 'user'])
  roles?: string;
}
