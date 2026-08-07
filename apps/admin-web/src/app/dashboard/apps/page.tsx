'use client';

import { useState } from 'react';
import { Plus, Trash2, Eye, Loader2, Search, Pencil, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useApps, useCreateApp, useUpdateApp, useDeleteApp } from '@/hooks/use-apps';
import type { AppInfo } from '@nestjs-sso/shared';

export default function AppsPage() {
  const { data, isLoading, search, setSearch } = useApps();
  const createApp = useCreateApp();
  const updateApp = useUpdateApp();
  const deleteApp = useDeleteApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [formName, setFormName] = useState('');
  const [formRedirectUri, setFormRedirectUri] = useState('');
  const [formLogoutUrl, setFormLogoutUrl] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formPrimaryColor, setFormPrimaryColor] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AppInfo | null>(null);
  const [createdApp, setCreatedApp] = useState<AppInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function openCreate() {
    setEditMode(false);
    setSelectedApp(null);
    setFormName('');
    setFormRedirectUri('');
    setFormLogoutUrl('');
    setFormLogoUrl('');
    setFormPrimaryColor('');
    setModalOpen(true);
  }

  function openEdit(record: AppInfo) {
    setEditMode(true);
    setSelectedApp(record);
    setFormName(record.name);
    setFormRedirectUri(record.redirectUri);
    setFormLogoutUrl(record.logoutCallbackUrl || '');
    setFormLogoUrl(record.logoUrl || '');
    setFormPrimaryColor(record.primaryColor || '');
    setModalOpen(true);
  }

  function openDetail(record: AppInfo) {
    setSelectedApp(record);
    setDetailOpen(true);
  }

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      if (editMode && selectedApp) {
        await updateApp.mutateAsync({
          appId: selectedApp.appId,
          body: {
            name: formName,
            redirectUri: formRedirectUri,
            logoutCallbackUrl: formLogoutUrl || undefined,
            logoUrl: formLogoUrl || undefined,
            primaryColor: formPrimaryColor || undefined,
          },
        });
        toast.success('更新成功');
      } else {
        const result = await createApp.mutateAsync({
          name: formName,
          redirectUri: formRedirectUri,
          logoutCallbackUrl: formLogoutUrl || undefined,
          logoUrl: formLogoUrl || undefined,
          primaryColor: formPrimaryColor || undefined,
        });
        setCreatedApp(result as AppInfo);
        toast.success('创建成功');
      }
      setModalOpen(false);
    } catch (err: any) {
      const message: string = err?.message || '操作失败';
      if (message.includes('已达上限')) {
        toast.error('应用数量已达上限', {
          description: '每个企业最多可创建 10 个应用。如需更多，请联系超级管理员。',
          duration: 6000,
        });
      } else {
        toast.error(message);
      }
    }
  };

  async function handleDelete(appId: string) {
    try {
      await deleteApp.mutateAsync(appId);
      toast.success('已删除');
      setDeleteTarget(null);
    } catch {
      toast.error('删除失败');
    }
  }

  const isSubmitting = createApp.isPending || updateApp.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">应用管理</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建应用
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索应用名称或 App ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>应用名称</TableHead>
              <TableHead>App ID</TableHead>
              <TableHead>回调地址</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[140px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="mr-1">{item.appId}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 inline-flex"
                      onClick={() => copyToClipboard(item.appId, `appId-${item.id}`)}
                    >
                      {copiedField === `appId-${item.id}` ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {item.redirectUri}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.applicationType === 'web' ? 'Web 应用' : '原生应用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDetail(item)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(item)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? '编辑应用' : '新建应用'}</DialogTitle>
            <DialogDescription>{editMode ? '修改应用配置' : '创建一个新的 OAuth 2.0 应用'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">应用名称</Label>
                <Input
                  id="name"
                  placeholder="如：订单管理系统"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirectUri">回调地址</Label>
                <Input
                  id="redirectUri"
                  placeholder="如：http://localhost:8080/callback"
                  value={formRedirectUri}
                  onChange={(e) => setFormRedirectUri(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoutUrl">登出回调地址</Label>
                <Input
                  id="logoutUrl"
                  placeholder="可选"
                  value={formLogoutUrl}
                  onChange={(e) => setFormLogoutUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="可选"
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">品牌主色</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    placeholder="如：#2563EB"
                    value={formPrimaryColor}
                    onChange={(e) => setFormPrimaryColor(e.target.value)}
                  />
                  {formPrimaryColor && (
                    <div
                      className="h-10 w-10 rounded-md border shrink-0"
                      style={{ backgroundColor: formPrimaryColor }}
                    />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editMode ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>应用详情</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">应用名称</span>
                <span className="font-medium">{selectedApp.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">App ID</span>
                <span className="flex items-center gap-1">
                  <span className="font-mono text-xs">{selectedApp.appId}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(selectedApp.appId, 'detail-appId')}
                  >
                    {copiedField === 'detail-appId' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Client Secret</span>
                <span className="flex items-center gap-1">
                  <span className="font-mono text-xs max-w-[180px] truncate">
                    {selectedApp.secret || '***'}
                  </span>
                  {selectedApp.secret && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(selectedApp.secret!, 'detail-secret')}
                    >
                      {copiedField === 'detail-secret' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">回调地址</span>
                <span className="font-mono text-xs max-w-[280px] truncate">{selectedApp.redirectUri}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">登出回调</span>
                <span className="max-w-[280px] truncate">{selectedApp.logoutCallbackUrl || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">应用类型</span>
                <Badge variant="outline">{selectedApp.applicationType === 'web' ? 'Web 应用' : '原生应用'}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">认证方式</span>
                <span>{selectedApp.tokenEndpointAuthMethod}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">品牌主色</span>
                <span className="flex items-center gap-2">
                  {selectedApp.primaryColor && (
                    <span
                      className="inline-block h-4 w-4 rounded"
                      style={{ backgroundColor: selectedApp.primaryColor }}
                    />
                  )}
                  {selectedApp.primaryColor || '-'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span>{new Date(selectedApp.createdAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="确认删除应用"
        description={`确定要删除应用「${deleteTarget?.name}」吗？此操作不可撤销，该应用的所有授权和令牌将立即失效。`}
        loading={deleteApp.isPending}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.appId)}
      />

      {/* Post-Creation Secret Dialog */}
      <Dialog open={!!createdApp} onOpenChange={(open) => !open && setCreatedApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>应用创建成功</DialogTitle>
            <DialogDescription>
              请立即保存以下凭据，<span className="font-semibold text-destructive">Client Secret 仅显示一次</span>，关闭后将无法再次查看。
            </DialogDescription>
          </DialogHeader>
          {createdApp && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Client ID</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                    {createdApp.appId}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(createdApp.appId, 'appId')}
                  >
                    {copiedField === 'appId' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Client Secret</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                    {createdApp.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(createdApp.secret!, 'secret')}
                  >
                    {copiedField === 'secret' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedApp(null)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}