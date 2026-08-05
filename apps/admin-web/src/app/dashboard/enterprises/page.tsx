'use client';

import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import type { Enterprise, PaginatedResponse } from '@nestjs-sso/shared';

export default function EnterprisesPage() {
  const [data, setData] = useState<Enterprise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Enterprise | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  useEffect(() => { loadData(); }, [pagination]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get('/enterprises', { params: pagination }) as unknown as PaginatedResponse<Enterprise>;
      setData(res.items);
      setTotal(res.total);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(values: any) {
    try {
      if (editing) {
        await api.patch(`/enterprises/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/enterprises', values);
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
      await api.delete(`/enterprises/${id}`);
      message.success('已删除');
      loadData();
    } catch { message.error('删除失败'); }
  }

  const columns = [
    { title: '企业名称', dataIndex: 'name', key: 'name' },
    { title: '标识', dataIndex: 'slug', key: 'slug' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s === 'active' ? '正常' : '已禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: Enterprise) => (
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
        <h2>企业管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          新建企业
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ current: pagination.page, pageSize: pagination.pageSize, total, onChange: (p, ps) => setPagination({ page: p, pageSize: ps }) }}
      />
      <Modal title={editing ? '编辑企业' : '新建企业'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
            <Input placeholder="如：腾讯科技有限公司" />
          </Form.Item>
          <Form.Item name="slug" label="标识" rules={[{ required: true, message: '请输入标识' }, { pattern: /^[a-z0-9-]+$/, message: '只能包含小写字母、数字和短横线' }]}>
            <Input placeholder="如：tencent" disabled={!!editing} />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="状态">
              <Input placeholder="active / disabled" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}