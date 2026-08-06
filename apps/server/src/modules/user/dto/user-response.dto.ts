import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户基本信息数据体（注册成功返回的 data 字段）。
 * 不含 createdAt，注册接口仅返回基本字段。
 */
export class UserDataDto {
  @ApiProperty({
    description: '用户 ID（UUID）',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({ description: '用户名', example: 'alice' })
  username: string;

  @ApiProperty({
    description: '邮箱（注册时可选，可能为 null）',
    example: 'alice@example.com',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: '是否已软删除',
    example: false,
  })
  isDeleted: boolean;

  @ApiProperty({
    description: '是否已启用',
    example: true,
  })
  isEnabled: boolean;
}

/**
 * 用户资料数据体（含创建时间，profile 接口返回的 data 字段）。
 */
export class UserProfileDataDto extends UserDataDto {
  @ApiProperty({
    description: '创建时间（ISO 8601）',
    example: '2026-08-04T10:00:00.000Z',
  })
  createdAt: Date;
}

/**
 * 注册接口完整返回体（统一响应封装 + 用户基本信息）。
 */
export class RegisterResponseDto {
  @ApiProperty({ description: '业务状态码', example: 201 })
  code: number;

  @ApiProperty({ description: '提示信息', example: '注册成功' })
  message: string;

  @ApiProperty({ type: UserDataDto, description: '注册成功的用户信息' })
  data: UserDataDto;

  @ApiProperty({
    description: '响应时间戳（ISO 8601）',
    example: '2026-08-04T10:00:00.000Z',
  })
  timestamp: string;
}

/**
 * 用户资料接口完整返回体（统一响应封装 + 用户资料）。
 */
export class ProfileResponseDto {
  @ApiProperty({ description: '业务状态码', example: 200 })
  code: number;

  @ApiProperty({ description: '提示信息', example: 'success' })
  message: string;

  @ApiProperty({ type: UserProfileDataDto, description: '当前登录用户资料' })
  data: UserProfileDataDto;

  @ApiProperty({
    description: '响应时间戳（ISO 8601）',
    example: '2026-08-04T10:00:00.000Z',
  })
  timestamp: string;
}
