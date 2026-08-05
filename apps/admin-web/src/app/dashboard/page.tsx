'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, message } from 'antd';
import { BankOutlined, UserOutlined, AppstoreOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { isSuperAdmin } from '@/lib/auth';
import type { OverviewData, PaginatedResponse, User } from '@nestjs-sso/shared';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const superAdmin = isSuperAdmin();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      if (superAdmin) {
        const ov = await api.get('/admin/overview') as unknown as OverviewData;
        setOverview(ov);
      }
      // 企业管理员：获取本企业用户和应用数
      const users = await api.get('/admin/enterprise/users', { params: { page: 1, pageSize: 1 } }) as unknown as PaginatedResponse<User>;
      setUserCount(users.total);
      const apps = await api.get('/admin/enterprise/apps') as unknown as any[];
      setAppCount(apps.length);
    } catch (err: any) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统概览</h2>
      <Row gutter={[16, 16]}>
        {superAdmin && (
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="企业总数" value={overview?.enterpriseCount || 0} prefix={<BankOutlined />} />
            </Card>
          </Col>
        )}
        <Col xs={24} sm={12} lg={superAdmin ? 6 : 8}>
          <Card>
            <Statistic title="用户总数" value={userCount} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={superAdmin ? 6 : 8}>
          <Card>
            <Statistic title="应用总数" value={appCount} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={superAdmin ? 6 : 8}>
          <Card>
            <Statistic title="角色" value={superAdmin ? '超级管理员' : '企业管理员'} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}