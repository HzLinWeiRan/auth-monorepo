'use client';

import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import type { User, PaginatedResponse } from '@nestjs-sso/shared';

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  useEffect(() => { loadData(); }, [pagination]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get('/admin/enterprise/users', { params: pagination }) as unknown as PaginatedResponse<User>;
      setData(res.items);
      setTotal(res.total);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(values: any) {
    try {
      if (editing) {
        await api.patch(`/admin/enterprise/users/${editing.id}`, {
          email: values.email,
          status: values.status,
          roles: values.roles,
        });
        message.success('更新成功');
      } else {
        await api.post('/admin/enterprise/users', values);
        message.success('创建成功');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/enterprise/users/${id}`);
      message.success('已删除');
      loadData();
    } catch { message.error('删除失败'); }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email', render: (e: string) => e || '-' },
    {
      title: '角色', dataIndex: 'roles', key: 'roles',
      render: (r: string) => {
        const roles = r?.split(',').map(s => s.trim()) || [];
        return roles.map(role => (
          <Tag key={role} color={role === 'enterprise_admin' ? 'blue' : 'default'}>
            {role === 'enterprise_admin' ? '企业管理员' : '用户'}
          </Tag>
        ));
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s === 'active' ? '正常' : '已禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>用户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          新建用户
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ current: pagination.page, pageSize: pagination.pageSize, total, onChange: (p, ps) => setPagination({ page: p, pageSize: ps }) }}
      />
      <Modal title={editing ? '编辑用户' : '新建用户'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editing && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="用户名" />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder="密码" />
              </Form.Item>
            </>
          )}
          <Form.Item name="email" label="邮箱">
            <Input placeholder="邮箱" />
          </Form.Item>
          {editing && (
            <>
              <Form.Item name="status" label="状态">
                <Input placeholder="active / disabled" />
              </Form.Item>
              <Form.Item name="roles" label="角色">
                <Input placeholder="enterprise_admin / user" />
              </Form.Item>
            </>
          )}
          {!editing && (
            <Form.Item name="roles" label="角色" initialValue="user">
              <Input placeholder="user 或 enterprise_admin" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}