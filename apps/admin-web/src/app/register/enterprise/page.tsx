'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRegisterEnterprise } from '@/hooks/use-register';

export default function EnterpriseRegisterPage() {
  const router = useRouter();
  const registerEnterprise = useRegisterEnterprise();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [enterpriseName, setEnterpriseName] = useState('');
  const [enterpriseSlug, setEnterpriseSlug] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerEnterprise.mutateAsync({
        username,
        password,
        email: email || undefined,
        enterpriseName,
        enterpriseSlug,
      });
      toast.success('企业注册成功，请登录');
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.message || '注册失败');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">企业注册</CardTitle>
          <CardDescription>创建企业并注册管理员账号</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="enterpriseName">企业名称</Label>
              <Input
                id="enterpriseName"
                placeholder="如：腾讯科技有限公司"
                value={enterpriseName}
                onChange={(e) => setEnterpriseName(e.target.value)}
                required
                minLength={2}
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enterpriseSlug">企业标识</Label>
              <Input
                id="enterpriseSlug"
                placeholder="如：tencent（仅小写字母、数字和短横线）"
                value={enterpriseSlug}
                onChange={(e) => setEnterpriseSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                required
                minLength={2}
                maxLength={64}
                pattern="^[a-z0-9-]+$"
              />
            </div>
            <hr className="my-2" />
            <p className="text-sm font-medium text-muted-foreground">管理员账号信息</p>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="3-32 位字符"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱（可选）</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={registerEnterprise.isPending}>
              {registerEnterprise.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              注册企业
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              已有账号？<Link href="/login" className="text-primary hover:underline">去登录</Link>
              <span className="mx-2">|</span>
              仅注册用户？<Link href="/register" className="text-primary hover:underline">普通注册</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}