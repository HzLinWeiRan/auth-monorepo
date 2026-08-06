import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { Admin } from '@/lib/hey-api-client';
import { unwrapResult } from '@/lib/query-adapter';
import { queryKeys } from './query-keys';
import type { PaginatedResponse } from '@nestjs-sso/shared';

export function useActivity() {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  const query = useQuery({
    queryKey: queryKeys.activity.list(pagination),
    queryFn: () => unwrapResult(Admin.getEnterpriseActivity({ query: pagination })),
    placeholderData: keepPreviousData,
    select: (data) => {
      const typed = data as PaginatedResponse<{
        id: string;
        userId: string;
        username: string;
        appName?: string;
        createdAt: string;
      }>;
      return { items: typed.items, total: typed.total };
    },
  });

  return { ...query, pagination, setPagination };
}