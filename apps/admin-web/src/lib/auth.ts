import Cookies from 'js-cookie';
import api from './api';
import type { AdminUser, LoginResponse } from '@nestjs-sso/shared';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const data = await api.post('/admin/login', { username, password }) as unknown as LoginResponse;
  Cookies.set('admin_token', data.accessToken, { expires: 1 }); // 1 day
  Cookies.set('admin_user', JSON.stringify(data.user), { expires: 1 });
  return data;
}

export function logout(): void {
  Cookies.remove('admin_token');
  Cookies.remove('admin_user');
  window.location.href = '/login';
}

export function getToken(): string | undefined {
  return Cookies.get('admin_token');
}

export function getUser(): AdminUser | null {
  const raw = Cookies.get('admin_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSuperAdmin(): boolean {
  const user = getUser();
  return user?.roles?.includes('super_admin') ?? false;
}

export function isEnterpriseAdmin(): boolean {
  const user = getUser();
  return user?.roles?.includes('enterprise_admin') ?? false;
}