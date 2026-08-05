'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { login } from '@/lib/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || '登录失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        style={{ width: 400, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <SafetyCertificateOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ marginBottom: 4 }}>SSO 管理后台</Title>
          <Text type="secondary">统一身份认证中心</Text>
        </div>

        <Form onFinish={onFinish} size="large" layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{
                height: 44, borderRadius: 10, fontSize: 16,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
              }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
          演示账号：admin / Admin@123
        </Text>
      </Card>
    </div>
  );
}