import { useEffect, useState } from 'react';
import { Table, Tag, Card, Row, Col, Statistic, Badge } from 'antd';
import { TagOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const statusColorMap = { active: 'green', expired: 'red', used: 'default' };
const statusTextMap = { active: '可用', expired: '已过期', used: '已使用' };

export default function Coupons({ role }) {
  const [coupons, setCoupons] = useState([]);

  const load = async () => {
    const res = await axios.get('/api/coupons');
    setCoupons(res.data);
  };

  useEffect(() => { load(); }, []);

  const active = coupons.filter(c => c.status === 'active').length;
  const expired = coupons.filter(c => c.status === 'expired').length;
  const used = coupons.filter(c => c.status === 'used').length;

  const columns = [
    { title: '券码', dataIndex: 'code', key: 'code', render: v => <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{v}</code> },
    { title: '面额', dataIndex: 'amount', key: 'amount', render: v => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{v}</span> },
    { title: '类型', dataIndex: 'type', key: 'type', render: v => v === 'fixed' ? '固定金额' : '折扣' },
    { title: '最低消费', dataIndex: 'min_amount', key: 'min', render: v => v > 0 ? `满${v}元可用` : '无门槛' },
    { title: '指定学员', dataIndex: 'student_name', key: 'stu', render: v => v || '不限' },
    { title: '有效期', dataIndex: 'expire_date', key: 'exp', render: v => <span style={{ color: dayjs(v).isBefore(dayjs()) ? '#f5222d' : '#52c41a' }}>{v}</span> },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: v => <Tag color={statusColorMap[v]}>{statusTextMap[v]}</Tag>,
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small"><Statistic title="可用券" value={active} valueStyle={{ color: '#52c41a' }} prefix={<TagOutlined />} /></Card>
        </Col>
        <Col span={8}>
          <Card size="small"><Statistic title="已过期" value={expired} valueStyle={{ color: '#f5222d' }} /></Card>
        </Col>
        <Col span={8}>
          <Card size="small"><Statistic title="已使用" value={used} valueStyle={{ color: '#999' }} /></Card>
        </Col>
      </Row>

      <Table dataSource={coupons} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />
    </div>
  );
}
