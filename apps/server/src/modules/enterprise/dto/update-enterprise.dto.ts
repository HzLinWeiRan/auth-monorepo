import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateEnterpriseDto {
  @ApiPropertyOptional({ description: '企业名称', example: '腾讯科技有限公司' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ description: 'URL 友好标识', example: 'tencent' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9-]+$/, {
    message: '企业标识只能包含小写字母、数字和短横线',
  })
  slug?: string;

  @ApiPropertyOptional({ description: '是否启用企业', example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
