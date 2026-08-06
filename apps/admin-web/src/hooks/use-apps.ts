import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Admin } from '@/lib/hey-api-client';
import { unwrapResult } from '@/lib/query-adapter';
import { queryKeys } from './query-keys';
import type { AppInfo } from '@nestjs-sso/shared';

export function useApps() {
  const [search, setSearch] = useState('');

  return {
    ...useQuery({
      queryKey: queryKeys.apps.list(search || undefined),
      queryFn: () => unwrapResult(Admin.getEnterpriseApps({ query: { search: search || undefined } })),
      select: (data) => data as AppInfo[],
    }),
    search,
    setSearch,
  };
}

export function useCreateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof Admin.createEnterpriseApp>[0]['body']) =>
      unwrapResult(Admin.createEnterpriseApp({ body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

export function useUpdateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appId,
      body,
    }: {
      appId: string;
      body: Parameters<typeof Admin.updateEnterpriseApp>[0]['body'];
    }) => unwrapResult(Admin.updateEnterpriseApp({ path: { appId }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

export function useDeleteApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) =>
      unwrapResult(Admin.deleteEnterpriseApp({ path: { appId } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}