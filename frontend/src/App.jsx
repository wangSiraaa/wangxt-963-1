import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ExperimentOutlined,
  CommentOutlined,
  TagOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  FundOutlined,
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Trials from './pages/Trials';
import Feedbacks from './pages/Feedbacks';
import Coupons from './pages/Coupons';
import Enrollments from './pages/Enrollments';
import Waitlists from './pages/Waitlists';
import Funnel from './pages/Funnel';
import RuleExplanations from './pages/RuleExplanations';
import RoleSwitch from './pages/RoleSwitch';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/leads', icon: <UserOutlined />, label: '线索管理' },
  { key: '/trials', icon: <ExperimentOutlined />, label: '试听管理' },
  { key: '/feedbacks', icon: <CommentOutlined />, label: '课堂反馈' },
  { key: '/enrollments', icon: <CheckCircleOutlined />, label: '报名管理' },
  { key: '/waitlists', icon: <ClockCircleOutlined />, label: '候补管理' },
  { key: '/coupons', icon: <TagOutlined />, label: '优惠券' },
  { key: '/funnel', icon: <BarChartOutlined />, label: '转正漏斗' },
  { key: '/rules', icon: <FileTextOutlined />, label: '规则解释' },
];

export default function App() {
  const location = useLocation();
  const [role, setRole] = useState('consultant');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark">
        <div style={{ height: 48, margin: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
          📚 试听转正系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => window.location.href = key}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            {menuItems.find(m => m.key === location.pathname)?.label || '工作台'}
          </span>
          <RoleSwitch role={role} onRoleChange={setRole} />
        </Header>
        <Content style={{ margin: 16, padding: 20, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Routes>
            <Route path="/" element={<Dashboard role={role} />} />
            <Route path="/leads" element={<Leads role={role} />} />
            <Route path="/trials" element={<Trials role={role} />} />
            <Route path="/feedbacks" element={<Feedbacks role={role} />} />
            <Route path="/enrollments" element={<Enrollments role={role} />} />
            <Route path="/waitlists" element={<Waitlists role={role} />} />
            <Route path="/coupons" element={<Coupons role={role} />} />
            <Route path="/funnel" element={<Funnel role={role} />} />
            <Route path="/rules" element={<RuleExplanations role={role} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
