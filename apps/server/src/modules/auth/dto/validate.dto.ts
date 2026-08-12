import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** SP 向 IdP 校验用户 Token（全局会话）是否仍然有效 */
export class ValidateDto {
  @ApiProperty({
    example: 'eyJhbGciOi...',
    description: '待校验的 Access Token',
  })
  @IsString()
  @MinLength(8)
  token: string;
}
