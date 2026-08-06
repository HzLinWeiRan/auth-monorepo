'use client';

/**
 * Dashboard 布局 — 使用 shadcn/ui Sidebar 组件实现。
 *
 * 结构：
 *  - SidebarProvider：管理侧边栏展开/折叠状态，支持 cookie 持久化
 *  - Sidebar (collapsible="icon")：折叠后仅显示图标，通过 tooltip 显示标签
 *  - SidebarInset：主内容区域，自动适配侧边栏宽度变化
 *
 * 响应式：
 *  - 桌面端：侧边栏固定，支持折叠到图标模式
 *  - 移动端 (<768px)：侧边栏以 Sheet 抽屉形式展示，通过 SidebarTrigger 开关
 */

import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  AppWindow,
  Activity,
  LogOut,
  Shield,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { logout } from '@/lib/auth';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';
import { SkinImportDialog } from '@/components/theme/SkinImportDialog';
import type { AdminUser } from '@nestjs-sso/shared';

// ---- 导航项配置 ----
const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: '概览', adminOnly: false },
  { href: '/dashboard/enterprises', icon: Building2, label: '企业管理', adminOnly: true },
  { href: '/dashboard/users', icon: Users, label: '用户管理', adminOnly: true },
  { href: '/dashboard/apps', icon: AppWindow, label: '应用管理', adminOnly: false },
  { href: '/dashboard/activity', icon: Activity, label: '活动记录', adminOnly: false },
];

// ---- Props ----
interface Props {
  user: AdminUser | null;
  superAdmin: boolean;
  children: React.ReactNode;
}

export function DashboardLayoutClient({ user, superAdmin, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // 根据角色过滤可见的导航项
  const visibleItems = navItems.filter((item) => !item.adminOnly || superAdmin);

  return (
    <SidebarProvider>
      {/* ============== 侧边栏 ============== */}
      <Sidebar collapsible="icon">
        {/* 品牌标识 */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">SSO 管理</span>
                  <span className="text-xs text-sidebar-foreground/60">统一身份认证</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        {/* 主导航菜单 */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => router.push(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* 底部用户信息（仅展示，操作在顶部 Header 中） */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="truncate text-sm font-medium">
                    {user?.username || '管理员'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60">
                    {superAdmin ? '超级管理员' : '企业管理员'}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* ============== 主内容区域 ============== */}
      <SidebarInset>
        {/* 顶部导航栏 */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-6">
          <SidebarTrigger />
          <div className="flex items-center gap-1">
            <ThemeCustomizer />
            <SkinImportDialog />
            <ThemeSwitcher />
            <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <Avatar className="size-8 bg-sidebar-primary">
                <AvatarFallback>
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex sm:flex-col sm:items-start">
                <span className="text-sm font-medium">
                  {user?.username || '管理员'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {superAdmin ? '超级管理员' : '企业管理员'}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-destructive"
              >
                <LogOut className="mr-2 size-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}