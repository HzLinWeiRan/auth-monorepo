'use client';

import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Tag, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import type { AppInfo } from '@nestjs-sso/shared';

const { Text, Paragraph } = Typography;

export default function AppsPage() {
  const [data, setData] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get('/admin/enterprise/apps') as unknown as AppInfo[];
      setData(res);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(values: any) {
    try {
      await api.post('/admin/enterprise/apps', values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  }

  async function handleDelete(appId: string) {
    try {
      await api.delete(`/admin/enterprise/apps/${appId}`);
      message.success('已删除');
      loadData();
    } catch { message.error('删除失败'); }
  }

  const columns = [
    { title: '应用名称', dataIndex: 'name', key: 'name' },
    { title: 'App ID', dataIndex: 'appId', key: 'appId', render: (id: string) => <Text code>{id}</Text> },
    { title: '回调地址', dataIndex: 'redirectUri', key: 'redirectUri', ellipsis: true },
    {
      title: '类型', dataIndex: 'applicationType', key: 'applicationType',
      render: (t: string) => <Tag>{t === 'web' ? 'Web 应用' : '原生应用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: AppInfo) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => { setSelectedApp(record); setDetailOpen(true); }}>详情</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.appId)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>应用管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          新建应用
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />

      <Modal title="新建应用" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="应用名称" rules={[{ required: true }]}>
            <Input placeholder="如：订单管理系统" />
          </Form.Item>
          <Form.Item name="redirectUri" label="回调地址" rules={[{ required: true }]}>
            <Input placeholder="如：http://localhost:8080/callback" />
          </Form.Item>
          <Form.Item name="logoutCallbackUrl" label="登出回调地址">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="logoUrl" label="Logo URL">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="primaryColor" label="品牌主色">
            <Input placeholder="如：#2563EB" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="应用详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        {selectedApp && (
          <div>
            <Paragraph><Text strong>应用名称：</Text>{selectedApp.name}</Paragraph>
            <Paragraph><Text strong>App ID：</Text><Text code>{selectedApp.appId}</Text></Paragraph>
            <Paragraph><Text strong>回调地址：</Text>{selectedApp.redirectUri}</Paragraph>
            <Paragraph><Text strong>登出回调：</Text>{selectedApp.logoutCallbackUrl || '-'}</Paragraph>
            <Paragraph><Text strong>应用类型：</Text>{selectedApp.applicationType}</Paragraph>
            <Paragraph><Text strong>认证方式：</Text>{selectedApp.tokenEndpointAuthMethod}</Paragraph>
            <Paragraph><Text strong>品牌主色：</Text>
              {selectedApp.primaryColor && (
                <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: selectedApp.primaryColor, verticalAlign: 'middle', marginLeft: 8 }} />
              )}
              {' '}{selectedApp.primaryColor || '-'}
            </Paragraph>
            <Paragraph><Text strong>创建时间：</Text>{new Date(selectedApp.createdAt).toLocaleString()}</Paragraph>
          </div>
        )}
      </Modal>
    </div>
  );
}