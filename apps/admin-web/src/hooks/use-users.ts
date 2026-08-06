import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { Admin } from '@/lib/hey-api-client';
import { unwrapResult } from '@/lib/query-adapter';
import { queryKeys } from './query-keys';
import type { User, PaginatedResponse } from '@nestjs-sso/shared';

export function useUsers() {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: queryKeys.users.list({ ...pagination, search: search || undefined }),
    queryFn: () => unwrapResult(Admin.getEnterpriseUsers({ query: { ...pagination, search: search || undefined } })),
    placeholderData: keepPreviousData,
    select: (data) => {
      const typed = data as PaginatedResponse<User>;
      return { items: typed.items, total: typed.total };
    },
  });

  return { ...query, pagination, setPagination, search, setSearch };
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof Admin.createEnterpriseUser>[0]['body']) =>
      unwrapResult(Admin.createEnterpriseUser({ body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof Admin.updateEnterpriseUser>[0]['body'];
    }) => unwrapResult(Admin.updateEnterpriseUser({ path: { id }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrapResult(Admin.deleteEnterpriseUser({ path: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}