import { useMutation } from '@tanstack/react-query';
import { login } from '@/lib/auth';

export function useLoginMutation() {
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
  });
}