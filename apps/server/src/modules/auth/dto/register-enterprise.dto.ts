import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * 企业注册入参：同时创建企业 + 企业管理员账号。
 */
export class RegisterEnterpriseDto {
  @ApiProperty({ example: 'zhangsan', description: '管理员用户名（3-32 位）' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @ApiProperty({ example: 'Str0ng@Pass', description: '密码（至少 6 位）' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;

  @ApiPropertyOptional({ example: 'zhangsan@example.com', description: '邮箱' })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @ApiProperty({ example: '腾讯科技有限公司', description: '企业名称' })
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  enterpriseName: string;

  @ApiProperty({
    example: 'tencent',
    description: '企业标识（slug，仅小写字母、数字和短横线）',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9-]+$/, {
    message: '企业标识只能包含小写字母、数字和短横线',
  })
  enterpriseSlug: string;
}
