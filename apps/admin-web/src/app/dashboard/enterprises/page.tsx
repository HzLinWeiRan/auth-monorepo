'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  useEnterprises,
  useCreateEnterprise,
  useUpdateEnterprise,
  useDeleteEnterprise,
} from '@/hooks/use-enterprises';
import type { Enterprise } from '@nestjs-sso/shared';

export default function EnterprisesPage() {
  const {
    data: queryData,
    isLoading,
    pagination,
    setPagination,
    search,
    setSearch,
  } = useEnterprises();
  const createEnterprise = useCreateEnterprise();
  const updateEnterprise = useUpdateEnterprise();
  const deleteEnterprise = useDeleteEnterprise();

  const data = queryData?.items ?? [];
  const total = queryData?.total ?? 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Enterprise | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Enterprise | null>(null);

  function openCreate() {
    setEditing(null);
    setFormName('');
    setFormSlug('');
    setFormIsEnabled(true);
    setModalOpen(true);
  }

  function openEdit(record: Enterprise) {
    setEditing(record);
    setFormName(record.name);
    setFormSlug(record.slug);
    setFormIsEnabled(record.isEnabled);
    setModalOpen(true);
  }

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateEnterprise.mutateAsync({
          id: editing.id,
          body: {
            name: formName,
            isEnabled: formIsEnabled,
          },
        });
        toast.success('更新成功');
      } else {
        await createEnterprise.mutateAsync({
          name: formName,
          slug: formSlug,
        });
        toast.success('创建成功');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || '操作失败');
    }
  };

  async function handleDelete(id: string) {
    try {
      await deleteEnterprise.mutateAsync(id);
      toast.success('已删除');
      setDeleteTarget(null);
    } catch {
      toast.error('删除失败');
    }
  }

  const isSubmitting = createEnterprise.isPending || updateEnterprise.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">企业管理</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建企业
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索企业名称或标识..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="pl-10"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>企业名称</TableHead>
              <TableHead>标识</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[140px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-sm">{item.slug}</TableCell>
                  <TableCell>
                    {item.isDeleted ? (
                      <Badge variant="destructive">已删除</Badge>
                    ) : item.isEnabled ? (
                      <Badge variant="default">正常</Badge>
                    ) : (
                      <Badge variant="secondary">已禁用</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
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

      {/* Pagination */}
      {total > pagination.pageSize && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {pagination.page} 页 / 共 {Math.ceil(total / pagination.pageSize)} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= Math.ceil(total / pagination.pageSize)}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            下一页
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑企业' : '新建企业'}</DialogTitle>
            <DialogDescription>
              {editing ? '修改企业信息' : '创建一个新的企业'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">企业名称</Label>
                <Input
                  id="name"
                  placeholder="如：腾讯科技有限公司"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">标识</Label>
                <Input
                  id="slug"
                  placeholder="如：tencent"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  disabled={!!editing}
                  pattern="^[a-z0-9-]+$"
                  title="只能包含小写字母、数字和短横线"
                  required={!editing}
                />
              </div>
              {editing && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="isEnabled" className="cursor-pointer">启用</Label>
                  <Switch
                    id="isEnabled"
                    checked={formIsEnabled}
                    onCheckedChange={setFormIsEnabled}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="确认删除企业"
        description={`确定要删除企业「${deleteTarget?.name}」吗？此操作不可撤销，该企业下的所有数据和用户也将被删除。`}
        loading={deleteEnterprise.isPending}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}