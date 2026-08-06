export const queryKeys = {
  overview: ['admin', 'overview'] as const,
  enterprises: {
    all: ['admin', 'enterprises'] as const,
    list: (params: { page: number; pageSize: number; search?: string }) =>
      ['admin', 'enterprises', params] as const,
  },
  users: {
    all: ['admin', 'users'] as const,
    list: (params: { page: number; pageSize: number; search?: string }) =>
      ['admin', 'users', params] as const,
  },
  apps: {
    all: ['admin', 'apps'] as const,
    list: (search?: string) =>
      ['admin', 'apps', 'list', search] as const,
  },
  activity: {
    all: ['admin', 'activity'] as const,
    list: (params: { page: number; pageSize: number }) =>
      ['admin', 'activity', params] as const,
  },
};