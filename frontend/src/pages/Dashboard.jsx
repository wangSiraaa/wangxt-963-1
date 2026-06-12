import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography, Alert } from 'antd';
import {
  UserOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

export default function Dashboard({ role }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get('/api/dashboard/stats').then(res => setStats(res.data));
  }, []);

  if (!stats) return <div>加载中...</div>;

  const statCards = [
    { title: '线索总数', value: stats.leads, icon: <UserOutlined />, color: '#1890ff' },
    { title: '试听安排', value: stats.trials, icon: <ExperimentOutlined />, color: '#722ed1' },
    { title: '已到访', value: stats.visited, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: '正式报名', value: stats.enrollments, icon: <RiseOutlined />, color: '#fa8c16' },
    { title: '候补中', value: stats.waitlists, icon: <ClockCircleOutlined />, color: '#eb2f96' },
    { title: '课堂反馈', value: stats.feedbacks, icon: <CommentOutlined />, color: '#13c2c2' },
  ];

  const roleHint = {
    consultant: '当前角色：顾问 — 可管理线索、安排试听、更新到访状态',
    teacher: '当前角色：老师 — 可查看试听学员、提交课堂反馈',
    admin: '当前角色：教务 — 可办理正式报名、管理候补、使用优惠券',
  };

  return (
    <div>
      <Alert
        message={roleHint[role]}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title="转化率" value={stats.conversionRate} suffix="%" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title="到访率" value={stats.visitRate} suffix="%" valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map(s => (
          <Col span={4} key={s.title}>
            <Card className="stat-card">
              <Statistic
                title={s.title}
                value={s.value}
                valueStyle={{ color: s.color }}
                prefix={s.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="最近线索" size="small">
            <Table
              dataSource={stats.recentLeads}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: '学员', dataIndex: 'student_name', key: 'name' },
                { title: '顾问', dataIndex: 'consultant', key: 'cons' },
                {
                  title: '状态', dataIndex: 'status', key: 'st',
                  render: v => {
                    const map = { new: '新线索', trial_scheduled: '已排课', visited: '已到访', no_show: '未到访', enrolled: '已报名', waitlisted: '候补中' };
                    const colorMap = { new: 'blue', trial_scheduled: 'purple', visited: 'green', no_show: 'red', enrolled: 'orange', waitlisted: 'pink' };
                    return <Tag color={colorMap[v]}>{map[v] || v}</Tag>;
                  },
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最近试听" size="small">
            <Table
              dataSource={stats.recentTrials}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: '学员', dataIndex: 'student_name', key: 'name' },
                { title: '课程', dataIndex: 'course_name', key: 'course' },
                {
                  title: '到访', dataIndex: 'visited', key: 'vis',
                  render: v => <Tag color={v === 'yes' ? 'green' : 'default'}>{v === 'yes' ? '已到访' : '未到访'}</Tag>,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
