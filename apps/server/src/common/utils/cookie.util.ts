import { Request } from 'express';

/**
 * 从请求头解析 Cookie 字符串为键值对。
 * NestJS 默认不内置 cookie-parser，这里手动解析，避免额外依赖。
 */
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

/** 全局会话 Cookie 名称 */
export const SESSION_COOKIE = 'sso_session';
