'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, AppWindow, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Admin } from '@/lib/hey-api-client';
import { unwrapResult } from '@/lib/query-adapter';
import { isSuperAdmin } from '@/lib/auth';
import { useOverview } from '@/hooks/use-overview';
import { useApps } from '@/hooks/use-apps';
import type { OverviewData } from '@nestjs-sso/shared';

export default function DashboardPage() {
  const superAdmin = isSuperAdmin();

  const { data: overview, isLoading: overviewLoading } = useOverview(superAdmin);
  const { data: apps, isLoading: appsLoading } = useApps();
  const { data: userCount, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', 'count'],
    queryFn: () => unwrapResult(Admin.getEnterpriseUsers({ query: { page: 1, pageSize: 1 } })),
    select: (data) => (data as any).total ?? 0,
  });

  const isLoading = overviewLoading || appsLoading || usersLoading;

  const stats = [
    ...(superAdmin
      ? [
          {
            title: '企业总数',
            value: (overview as OverviewData)?.enterpriseCount || 0,
            icon: Building2,
            color: 'text-blue-500',
          },
        ]
      : []),
    {
      title: '用户总数',
      value: userCount || 0,
      icon: Users,
      color: 'text-green-500',
    },
    {
      title: '应用总数',
      value: apps?.length ?? 0,
      icon: AppWindow,
      color: 'text-purple-500',
    },
    {
      title: '角色',
      value: superAdmin ? '超级管理员' : '企业管理员',
      icon: Shield,
      color: 'text-orange-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">系统概览</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={cn('h-4 w-4', stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
              {stat.value}
            </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}