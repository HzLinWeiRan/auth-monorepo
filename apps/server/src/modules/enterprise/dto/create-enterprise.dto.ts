import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class CreateEnterpriseDto {
  @ApiProperty({ description: '企业名称', example: '腾讯科技有限公司' })
  @IsString()
  @IsNotEmpty({ message: '企业名称不能为空' })
  @MaxLength(128)
  name: string;

  @ApiProperty({
    description: 'URL 友好标识（字母、数字、短横线），如 tencent',
    example: 'tencent',
  })
  @IsString()
  @IsNotEmpty({ message: '企业标识不能为空' })
  @MaxLength(64)
  @Matches(/^[a-z0-9-]+$/, { message: '企业标识只能包含小写字母、数字和短横线' })
  slug: string;
}