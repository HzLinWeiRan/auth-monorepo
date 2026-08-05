import { ApiProperty } from '@nestjs/swagger';

// 从 @nestjs-sso/shared 重新导出共享类型
export { ApiResponse, PaginatedResponse, PagedData } from '@nestjs-sso/shared';

/**
 * 错误响应数据体（由 HttpExceptionFilter 统一序列化）。
 * 与 ApiResponse 结构分离：不含 data，额外含 path 字段。
 */
export class ErrorResponseDto {
  @ApiProperty({ description: '业务状态码（等同于 HTTP 状态码）', example: 401 })
  code: number;

  @ApiProperty({ description: '错误描述', example: '未携带或令牌无效' })
  message: string;

  @ApiProperty({ description: '响应时间戳（ISO 8601）', example: '2026-08-04T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: '请求路径', example: '/api/v1/users/profile' })
  path: string;
}

/**
 * 构造标准成功响应体。
 * @param code 业务状态码（默认 200，注册等资源创建可传 201）
 */
export function success<T>(data: T, message = 'success', code = 200) {
  return {
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}