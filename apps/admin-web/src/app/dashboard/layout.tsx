'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  UserOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { logout, getUser, isSuperAdmin } from '@/lib/auth';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const superAdmin = isSuperAdmin();
  const user = getUser();

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
    ...(superAdmin
      ? [{ key: '/dashboard/enterprises', icon: <BankOutlined />, label: '企业管理' }]
      : []),
    { key: '/dashboard/users', icon: <UserOutlined />, label: '用户管理' },
    { key: '/dashboard/apps', icon: <AppstoreOutlined />, label: '应用管理' },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => logout(),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark"
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10 }}>
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#667eea' }} />
          {!collapsed && <Text strong style={{ color: '#fff', marginLeft: 10, fontSize: 16 }}>SSO 管理</Text>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px', background: colorBgContainer,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 9,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#667eea' }} />
              <Text>{user?.username || '管理员'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {superAdmin ? '超级管理员' : '企业管理员'}
              </Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}