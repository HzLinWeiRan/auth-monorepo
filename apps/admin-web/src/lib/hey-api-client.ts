'use client';

import { client } from '@nestjs-sso/shared/generated/client.gen';
import Cookies from 'js-cookie';

// 配置 baseUrl
client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

// 请求拦截：注入 Bearer Token
client.interceptors.request.use((request) => {
  const token = Cookies.get('admin_token');
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }
  return request;
});

// 响应拦截：401 自动跳转登录页
client.interceptors.response.use((response) => {
  if (response.status === 401 && typeof window !== 'undefined') {
    Cookies.remove('admin_token');
    Cookies.remove('admin_user');
    window.location.href = '/login';
  }
  return response;
});

export { client };
export * from '@nestjs-sso/shared/generated';