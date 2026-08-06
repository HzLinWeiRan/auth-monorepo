import { useMutation } from '@tanstack/react-query';
import { Auth } from '@/lib/hey-api-client';
import { unwrapResult } from '@/lib/query-adapter';

export function useRegister() {
  return useMutation({
    mutationFn: (body: Parameters<typeof Auth.authRegister>[0]['body']) =>
      unwrapResult(Auth.authRegister({ body })),
  });
}

export function useRegisterEnterprise() {
  return useMutation({
    mutationFn: (body: Parameters<typeof Auth.authRegisterEnterprise>[0]['body']) =>
      unwrapResult(Auth.authRegisterEnterprise({ body })),
  });
}
