import { useEffect, useState } from 'react';
import { Table, Tag, Card, Row, Col, Statistic, Select, Space, Tooltip, Collapse, Typography, Divider } from 'antd';
import { TagOutlined, GiftOutlined, WalletOutlined, ClockCircleOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const statusColorMap = { active: 'green', expired: 'red', used: 'default' };
const statusTextMap = { active: '未使用', expired: '已过期', used: '已使用' };

const stackGroupColorMap = {
  vip: 'purple',
  summer: 'orange',
  common: 'blue',
};

const stackGroupNameMap = {
  vip: 'VIP专属组',
  summer: '暑期活动组',
  common: '日常满减组',
};

export default function Coupons({ role }) {
  const [coupons, setCoupons] = useState([]);
  const [couponStacks, setCouponStacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');

  const load = async () => {
    try {
      setLoading(true);
      const [couponsRes, stacksRes] = await Promise.all([
        axios.get('/api/coupons'),
        axios.get('/api/coupon-stacks'),
      ]);
      setCoupons(couponsRes.data || []);
      setCouponStacks(stacksRes.data || []);
    } catch (e) {
      console.error('加载优惠券数据失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeCoupons = coupons.filter(c => c.status === 'active');
  const active = activeCoupons.length;
  const expired = coupons.filter(c => c.status === 'expired').length;
  const used = coupons.filter(c => c.status === 'used').length;

  const totalSaved = coupons
    .filter(c => c.status === 'used')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const stackGroups = [...new Set(coupons.filter(c => c.stack_group).map(c => c.stack_group))];

  const amountRanges = [
    { value: 'all', label: '全部面值' },
    { value: '0-200', label: '200元以下' },
    { value: '200-500', label: '200-500元' },
    { value: '500+', label: '500元以上' },
  ];

  const filteredCoupons = coupons.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (groupFilter !== 'all') {
      if (groupFilter === 'none' && c.stack_group) return false;
      if (groupFilter !== 'none' && c.stack_group !== groupFilter) return false;
    }
    if (amountFilter !== 'all') {
      const amount = Number(c.amount) || 0;
      if (amountFilter === '0-200' && amount >= 200) return false;
      if (amountFilter === '200-500' && (amount < 200 || amount >= 500)) return false;
      if (amountFilter === '500+' && amount < 500) return false;
    }
    return true;
  });

  const getScopeText = (coupon) => {
    if (coupon.course_ids) {
      return '指定课程';
    }
    return '通用';
  };

  const getStackGroupTag = (coupon) => {
    if (!coupon.stackable || !coupon.stack_group) {
      return <Tag color="default">不可叠加</Tag>;
    }
    const color = stackGroupColorMap[coupon.stack_group] || 'blue';
    const name = stackGroupNameMap[coupon.stack_group] || coupon.stack_group;
    return (
      <Tooltip title={`${name}内优惠券互斥，不同组可叠加`}>
        <Tag color={color} icon={<GiftOutlined />}>
          {name}
        </Tag>
      </Tooltip>
    );
  };

  const columns = [
    {
      title: '券码',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: v => <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{v}</code>,
    },
    {
      title: '优惠券名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (v, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{v}</Text>
          {getStackGroupTag(record)}
        </Space>
      ),
    },
    {
      title: '面值',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (v, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ color: '#f5222d', fontWeight: 600, fontSize: 18 }}>¥{v}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.type === 'fixed' ? '固定金额' : '折扣券'}
          </Text>
        </Space>
      ),
    },
    {
      title: '使用条件',
      key: 'condition',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>
            {record.min_amount > 0 ? `满${record.min_amount}元可用` : '无门槛'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            使用范围：{getScopeText(record)}
          </Text>
        </Space>
      ),
    },
    {
      title: '指定学员',
      dataIndex: 'student_name',
      key: 'stu',
      width: 100,
      render: v => v || '不限',
    },
    {
      title: '有效期',
      dataIndex: 'expire_date',
      key: 'exp',
      width: 140,
      render: v => {
        const isExpired = dayjs(v).isBefore(dayjs());
        return (
          <Space direction="vertical" size={2}>
            <span style={{ color: isExpired ? '#f5222d' : '#52c41a' }}>{v}</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isExpired ? '已过期' : `${dayjs(v).diff(dayjs(), 'day')}天后到期`}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: v => (
        <Tag color={statusColorMap[v]} icon={v === 'active' ? <CheckCircleOutlined /> : v === 'expired' ? <ClockCircleOutlined /> : null}>
          {statusTextMap[v]}
        </Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: v => v || '-',
    },
  ];

  const stackRuleItems = [
    {
      key: '1',
      label: (
        <Space>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <Text strong>优惠叠加规则说明</Text>
        </Space>
      ),
      children: (
        <div style={{ padding: '8px 0' }}>
          <Paragraph style={{ marginBottom: 12 }}>
            优惠券叠加遵循以下规则，合理搭配可享受更多优惠：
          </Paragraph>

          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" variant="outlined" style={{ borderRadius: 8, marginBottom: 12 }}>
                <Space direction="vertical" size={8}>
                  <Text strong style={{ color: '#52c41a' }}>✓ 可以叠加的情况</Text>
                  <div style={{ paddingLeft: 8, borderLeft: '2px solid #52c41a' }}>
                    <div style={{ marginBottom: 6 }}>
                      <Text type="secondary">不同叠加组的优惠券</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      例如：VIP券（vip组）+ 暑期券（summer组）+ 日常满减券（common组）
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" variant="outlined" style={{ borderRadius: 8, marginBottom: 12 }}>
                <Space direction="vertical" size={8}>
                  <Text strong style={{ color: '#ff4d4f' }}>✗ 不能叠加的情况</Text>
                  <div style={{ paddingLeft: 8, borderLeft: '2px solid #ff4d4f' }}>
                    <div style={{ marginBottom: 6 }}>
                      <Text type="secondary">同一叠加组内的优惠券</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      例如：两张VIP券同属vip组，只能使用一张
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>📌 叠加示例</Text>
            <div style={{ background: '#f0f5ff', padding: '12px 16px', borderRadius: 8 }}>
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  假设您有以下3张优惠券：
                </Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color="purple">VIP券 - ¥500（vip组）</Tag>
                  <Tag color="orange">暑期券 - ¥300（summer组）</Tag>
                  <Tag color="blue">满减券 - ¥100（common组）</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 13, marginTop: 4 }}>
                  因为它们分属不同的叠加组，所以 <Text strong style={{ color: '#52c41a' }}>可以同时使用</Text>，
                  总共可优惠 <Text strong style={{ color: '#f5222d' }}>¥900</Text>
                </Text>
              </Space>
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>🏷️ 现有叠加组</Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stackGroups.map(g => (
                <Tag key={g} color={stackGroupColorMap[g] || 'blue'}>
                  {stackGroupNameMap[g] || g}
                </Tag>
              ))}
              {stackGroups.length === 0 && <Text type="secondary">暂无分组</Text>}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="有效优惠券"
              value={active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TagOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已使用"
              value={used}
              valueStyle={{ color: '#999' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已过期"
              value={expired}
              valueStyle={{ color: '#f5222d' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="累计优惠金额"
              value={totalSaved}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WalletOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Space wrap size="middle">
          <Space>
            <Text type="secondary">状态：</Text>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              size="small"
            >
              <Option value="all">全部状态</Option>
              <Option value="active">未使用</Option>
              <Option value="used">已使用</Option>
              <Option value="expired">已过期</Option>
            </Select>
          </Space>

          <Space>
            <Text type="secondary">分组：</Text>
            <Select
              value={groupFilter}
              onChange={setGroupFilter}
              style={{ width: 140 }}
              size="small"
            >
              <Option value="all">全部分组</Option>
              <Option value="none">无分组</Option>
              {stackGroups.map(g => (
                <Option key={g} value={g}>
                  {stackGroupNameMap[g] || g}
                </Option>
              ))}
            </Select>
          </Space>

          <Space>
            <Text type="secondary">面值：</Text>
            <Select
              value={amountFilter}
              onChange={setAmountFilter}
              style={{ width: 140 }}
              size="small"
            >
              {amountRanges.map(r => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Space>

          <Text type="secondary" style={{ marginLeft: 'auto' }}>
            共 {filteredCoupons.length} 张优惠券
          </Text>
        </Space>
      </Card>

      <Collapse
        items={stackRuleItems}
        defaultActiveKey={[]}
        style={{ marginBottom: 16 }}
        size="small"
      />

      <Table
        dataSource={filteredCoupons}
        rowKey="id"
        columns={columns}
        size="middle"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
