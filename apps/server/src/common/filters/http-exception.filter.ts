import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 统一异常过滤器：将所有异常（HTTP 异常与未捕获异常）序列化为一致的响应结构，
 * 便于 Swagger 文档与前端解析。
 *
 * 响应结构：
 * {
 *   code: number;        // 等同于 HTTP 状态码
 *   message: string;     // 错误描述
 *   timestamp: string;   // ISO 时间戳
 *   path: string;        // 请求路径
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const msg = (res as Record<string, unknown>).message;
        message = Array.isArray(msg)
          ? msg.join('; ')
          : ((msg as string) ?? exception.message);
      } else {
        message = exception.message;
      }
    }

    response.status(status).json({
      code: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
