'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield,
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useLoginMutation } from '@/hooks/use-login';

const loginSchema = z.object({
  username: z
    .string()
    .min(1, '请输入用户名')
    .min(2, '用户名至少需要 2 个字符'),
  password: z
    .string()
    .min(1, '请输入密码')
    .min(6, '密码至少需要 6 个字符'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(values);
      toast.success('登录成功', {
        description: '正在跳转到管理后台...',
      });
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err?.message || err?.response?.data?.message || '登录失败，请检查用户名和密码';
      toast.error('登录失败', {
        description: message,
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Main content */}
      <div className="flex flex-1">
        {/* Left branding panel - desktop only */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex lg:w-5/12 xl:w-1/2">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-foreground)/0.04_1px,transparent_1px),linear-gradient(to_bottom,var(--color-foreground)/0.04_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />

          {/* Logo & Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-primary-foreground">
                SSO 管理中心
              </span>
            </div>
          </div>

          {/* Brand message */}
          <div className="relative z-10 space-y-4">
            <h1 className="text-3xl font-bold leading-tight text-primary-foreground xl:text-4xl">
              统一身份认证
              <br />
              管理平台
            </h1>
            <p className="max-w-md text-base leading-relaxed text-primary-foreground/70">
              安全、高效的企业级单点登录管理系统。支持多租户隔离、
              OAuth 2.0 / OIDC 标准协议，为您的应用提供统一的身份认证服务。
            </p>
          </div>

          {/* Footer */}
          <div className="relative z-10">
            <p className="text-sm text-primary-foreground/50">
              &copy; {new Date().getFullYear()} SSO 统一身份认证中心
            </p>
          </div>
        </div>

        {/* Right login panel */}
        <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile logo */}
            <div className="flex flex-col items-center gap-3 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">
                  SSO 管理后台
                </h1>
                <p className="text-sm text-muted-foreground">
                  统一身份认证中心
                </p>
              </div>
            </div>

            {/* Login card */}
            <Card className="shadow-lg">
              <CardHeader className="space-y-1 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">账号登录</CardTitle>
                <CardDescription>
                  请输入您的管理员账号和密码
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Server-side error alert */}
                {loginMutation.isError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                      {loginMutation.error instanceof Error
                        ? loginMutation.error.message
                        : '登录失败，请检查用户名和密码'}
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                  >
                    {/* Username field */}
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            用户名
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="请输入用户名"
                              autoComplete="username"
                              autoFocus
                              disabled={loginMutation.isPending}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Password field */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <KeyRound className="h-3.5 w-3.5" />
                            密码
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="请输入密码"
                                autoComplete="current-password"
                                disabled={loginMutation.isPending}
                                className="pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          正在登录...
                        </>
                      ) : (
                        '登 录'
                      )}
                    </Button>
                  </form>
                </Form>

                <Separator className="my-6" />

                {/* Demo account hint */}
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">演示账号</span>
                    <br />
                    admin / Admin@123
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground">
              安全连接 · 数据加密传输
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}