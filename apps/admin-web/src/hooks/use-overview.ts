import { useQuery } from '@tanstack/react-query';
import { Admin } from '@/lib/hey-api-client';
import { unwrapResult } from '@/lib/query-adapter';
import { queryKeys } from './query-keys';
import type { OverviewData } from '@nestjs-sso/shared';

export function useOverview(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => unwrapResult(Admin.getAdminOverview()),
    enabled,
    select: (data) => data as OverviewData,
  });
}