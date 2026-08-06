import { cookies } from 'next/headers';
import type { AdminUser } from '@nestjs-sso/shared';
import { DashboardLayoutClient } from './DashboardLayoutClient';

async function parseUserFromCookie(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('admin_user')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await parseUserFromCookie();
  const superAdmin = user?.roles?.includes('super_admin') ?? false;

  return (
    <DashboardLayoutClient user={user} superAdmin={superAdmin}>
      {children}
    </DashboardLayoutClient>
  );
}