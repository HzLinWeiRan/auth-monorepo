import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { Enterprises } from '@/lib/hey-api-client';
import { unwrapResult } from '@/lib/query-adapter';
import { queryKeys } from './query-keys';
import type { Enterprise, PaginatedResponse } from '@nestjs-sso/shared';

export function useEnterprises() {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: queryKeys.enterprises.list({ ...pagination, search: search || undefined }),
    queryFn: () => unwrapResult(Enterprises.getEnterprises({ query: { ...pagination, search: search || undefined } })),
    placeholderData: keepPreviousData,
    select: (data) => {
      const typed = data as PaginatedResponse<Enterprise>;
      return { items: typed.items, total: typed.total };
    },
  });

  return { ...query, pagination, setPagination, search, setSearch };
}

export function useCreateEnterprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof Enterprises.createEnterprise>[0]['body']) =>
      unwrapResult(Enterprises.createEnterprise({ body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprises.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

export function useUpdateEnterprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof Enterprises.updateEnterprise>[0]['body'];
    }) => unwrapResult(Enterprises.updateEnterprise({ path: { id }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprises.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

export function useDeleteEnterprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrapResult(Enterprises.deleteEnterprise({ path: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprises.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}