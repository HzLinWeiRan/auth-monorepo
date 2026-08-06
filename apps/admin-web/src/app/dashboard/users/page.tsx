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
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users';
import type { User } from '@nestjs-sso/shared';

export default function UsersPage() {
  const {
    data: queryData,
    isLoading,
    pagination,
    setPagination,
    search,
    setSearch,
  } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const data = queryData?.items ?? [];
  const total = queryData?.total ?? 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formRoles, setFormRoles] = useState('user');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  function openCreate() {
    setEditing(null);
    setFormUsername('');
    setFormPassword('');
    setFormEmail('');
    setFormIsEnabled(true);
    setFormRoles('user');
    setModalOpen(true);
  }

  function openEdit(record: User) {
    setEditing(record);
    setFormUsername(record.username);
    setFormPassword('');
    setFormEmail(record.email || '');
    setFormIsEnabled(record.isEnabled);
    setFormRoles(record.roles || 'user');
    setModalOpen(true);
  }

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateUser.mutateAsync({
          id: editing.id,
          body: {
            email: formEmail,
            isEnabled: formIsEnabled,
            roles: formRoles,
          },
        });
        toast.success('更新成功');
      } else {
        await createUser.mutateAsync({
          username: formUsername,
          password: formPassword,
          email: formEmail,
          roles: formRoles,
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
      await deleteUser.mutateAsync(id);
      toast.success('已删除');
      setDeleteTarget(null);
    } catch {
      toast.error('删除失败');
    }
  }

  function renderRoles(roles: string) {
    const list = roles?.split(',').map((s) => s.trim()) || [];
    return list.map((role) => (
      <Badge key={role} variant={role === 'enterprise_admin' ? 'default' : 'secondary'} className="mr-1">
        {role === 'enterprise_admin' ? '企业管理员' : '用户'}
      </Badge>
    ));
  }

  const isSubmitting = createUser.isPending || updateUser.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建用户
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户名或邮箱..."
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
              <TableHead>用户名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
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
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.username}</TableCell>
                  <TableCell className="text-muted-foreground">{item.email || '-'}</TableCell>
                  <TableCell>{renderRoles(item.roles)}</TableCell>
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
            <DialogTitle>{editing ? '编辑用户' : '新建用户'}</DialogTitle>
            <DialogDescription>
              {editing ? '修改用户信息' : '创建一个新的用户'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {!editing && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      placeholder="用户名"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="密码"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="邮箱"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              {editing && (
                <>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="isEnabled" className="cursor-pointer">启用</Label>
                    <Switch
                      id="isEnabled"
                      checked={formIsEnabled}
                      onCheckedChange={setFormIsEnabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roles">角色</Label>
                    <Input
                      id="roles"
                      placeholder="enterprise_admin / user"
                      value={formRoles}
                      onChange={(e) => setFormRoles(e.target.value)}
                    />
                  </div>
                </>
              )}
              {!editing && (
                <div className="space-y-2">
                  <Label htmlFor="roles">角色</Label>
                  <Input
                    id="roles"
                    placeholder="user 或 enterprise_admin"
                    value={formRoles}
                    onChange={(e) => setFormRoles(e.target.value)}
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
        title="确认删除用户"
        description={`确定要删除用户「${deleteTarget?.username}」吗？此操作不可撤销。`}
        loading={deleteUser.isPending}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}