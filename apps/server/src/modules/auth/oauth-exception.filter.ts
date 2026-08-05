import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

/**
 * OAuth 浏览器端点异常过滤器。
 * 将 BadRequestException（DTO 校验失败）转为用户友好的 HTML 页面，
 * 避免浏览器端看到 JSON 格式的错误信息。
 */
@Catch(BadRequestException)
export class OAuthExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = '请求参数不完整';
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const msg = (exceptionResponse as Record<string, unknown>).message;
      if (Array.isArray(msg)) {
        message = msg.join('；');
      } else if (typeof msg === 'string') {
        message = msg;
      }
    }

    // 302 跳转回登录页，带上错误信息
    const loginQuery = new URLSearchParams();
    loginQuery.set('error', message);
    const originalClientId = req.query?.client_id || '';
    const originalRedirectUri = req.query?.redirect_uri || '';
    if (originalClientId) loginQuery.set('client_id', originalClientId as string);
    if (originalRedirectUri) loginQuery.set('redirect_uri', originalRedirectUri as string);

    res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSO 授权错误</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 480px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
    h1 { color: #e74c3c; font-size: 20px; margin: 0 0 16px; }
    p { color: #666; line-height: 1.6; margin: 0 0 24px; }
    .error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; color: #dc2626; font-size: 14px; margin-bottom: 24px; word-break: break-all; }
    a { display: inline-block; background: #3b82f6; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; }
    a:hover { background: #2563eb; }
    .hint { color: #999; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️ 授权请求参数不完整</h1>
    <div class="error">${message}</div>
    <p>OAuth 2.0 授权端点需要至少提供 <code>client_id</code> 和 <code>redirect_uri</code> 参数。</p>
    <a href="/oauth/login${loginQuery.toString() ? '?' + loginQuery.toString() : ''}">返回登录页</a>
    <div class="hint">请求路径：${req.url}</div>
  </div>
</body>
</html>`);
  }
}