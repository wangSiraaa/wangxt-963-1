import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Progress, Tag, Empty } from 'antd';
import {
  UserOutlined,
  ScheduleOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text } = Typography;

const funnelStages = [
  { key: 'leads', label: '线索', icon: <UserOutlined />, color: '#1890ff', gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' },
  { key: 'trial_scheduled', label: '试听安排', icon: <ScheduleOutlined />, color: '#722ed1', gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)' },
  { key: 'visited', label: '已到访', icon: <CheckCircleOutlined />, color: '#52c41a', gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' },
  { key: 'feedback_done', label: '反馈完成', icon: <CommentOutlined />, color: '#13c2c2', gradient: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)' },
  { key: 'enrolled', label: '正式报名', icon: <RiseOutlined />, color: '#fa8c16', gradient: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)' },
];

const otherStages = [
  { key: 'waitlisted', label: '候补中', icon: <ClockCircleOutlined />, color: '#eb2f96', gradient: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)' },
  { key: 'no_show', label: '未到访', icon: <CloseCircleOutlined />, color: '#ff4d4f', gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)' },
];

export default function Funnel({ role }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/funnel').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  if (!data) return <Empty description="暂无数据" />;

  const overallConversion = data.leads > 0 ? ((data.enrolled / data.leads) * 100).toFixed(1) : '0';
  const maxValue = data.leads || 1;

  const getConversionRate = (current, prev) => {
    if (prev === 0) return '0%';
    return ((current / prev) * 100).toFixed(1) + '%';
  };

  const renderFunnelBar = (stage, index) => {
    const value = data[stage.key] || 0;
    const prevKey = index > 0 ? funnelStages[index - 1].key : null;
    const prevValue = prevKey ? (data[prevKey] || 0) : value;
    const widthPercent = ((value / maxValue) * 100).toFixed(1);
    const rate = getConversionRate(value, prevValue);

    return (
      <div key={stage.key} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, color: stage.color }}>{stage.icon}</span>
            <Text strong style={{ fontSize: 15 }}>{stage.label}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color={stage.color} style={{ fontSize: 13, padding: '2px 10px' }}>
              {value} 人
            </Tag>
            {index > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                转化率 {rate}
              </Text>
            )}
            {index === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                基数 100%
              </Text>
            )}
          </div>
        </div>
        <div style={{ position: 'relative', height: 44, borderRadius: 8, overflow: 'hidden', background: '#f0f0f0' }}>
          <div
            style={{
              width: `${widthPercent}%`,
              height: '100%',
              background: stage.gradient,
              borderRadius: 8,
              transition: 'width 0.6s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 12,
              minWidth: 60,
            }}
          >
            <Text strong style={{ color: '#fff', fontSize: 14 }}>
              {((value / maxValue) * 100).toFixed(1)}%
            </Text>
          </div>
        </div>
      </div>
    );
  };

  const maxDayValue = Math.max(...(data.last7Days || []).map(d => Math.max(d.leads, d.enrolled)), 1);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 12,
              border: 'none',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>整体转化率</span>}
              value={overallConversion}
              suffix="%"
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
              prefix={<RiseOutlined style={{ color: '#fff' }} />}
            />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              报名人数 / 线索总数
            </Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: 12,
              border: 'none',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>线索总数</span>}
              value={data.leads}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
              prefix={<UserOutlined style={{ color: '#fff' }} />}
            />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              累计录入线索
            </Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: 12,
              border: 'none',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>正式报名</span>}
              value={data.enrolled}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined style={{ color: '#fff' }} />}
            />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              成功转正学员
            </Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            style={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              borderRadius: 12,
              border: 'none',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>到访率</span>}
              value={data.trial_scheduled > 0 ? ((data.visited / data.trial_scheduled) * 100).toFixed(1) : '0'}
              suffix="%"
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
              prefix={<ScheduleOutlined style={{ color: '#fff' }} />}
            />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              实际到访 / 预约试听
            </Text>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChartOutlined style={{ color: '#1890ff' }} />
            <span>转化漏斗</span>
          </div>
        }
        style={{ marginBottom: 24, borderRadius: 12 }}
      >
        <div style={{ padding: '12px 8px' }}>
          {funnelStages.map((stage, index) => renderFunnelBar(stage, index))}
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {otherStages.map(stage => {
          const value = data[stage.key] || 0;
          return (
            <Col span={12} key={stage.key}>
              <Card
                style={{ borderRadius: 12 }}
                bodyStyle={{ padding: 20 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: stage.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: '#fff',
                    }}
                  >
                    {stage.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{stage.label}</Text>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 'bold', color: stage.color }}>{value}</span>
                      <Text type="secondary" style={{ fontSize: 13 }}>人</Text>
                    </div>
                    <Progress
                      percent={((value / maxValue) * 100).toFixed(0)}
                      size="small"
                      strokeColor={stage.color}
                      showInfo={false}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChartOutlined style={{ color: '#722ed1' }} />
            <span>最近7天转化趋势</span>
          </div>
        }
        style={{ borderRadius: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 200, padding: '0 8px' }}>
          {(data.last7Days || []).map((day, index) => {
            const leadsHeight = (day.leads / maxDayValue) * 140;
            const enrolledHeight = (day.enrolled / maxDayValue) * 140;
            return (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 150 }}>
                  <div
                    style={{
                      width: 20,
                      height: `${Math.max(leadsHeight, 4)}px`,
                      background: 'linear-gradient(180deg, #1890ff 0%, #096dd9 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.6s ease',
                      position: 'relative',
                    }}
                    title={`线索: ${day.leads}`}
                  />
                  <div
                    style={{
                      width: 20,
                      height: `${Math.max(enrolledHeight, 4)}px`,
                      background: 'linear-gradient(180deg, #52c41a 0%, #389e0d 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.6s ease',
                      position: 'relative',
                    }}
                    title={`报名: ${day.enrolled}`}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(day.date).format('MM/DD')}
                </Text>
                <div style={{ fontSize: 10, color: '#999' }}>
                  转{day.conversion}%
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: 'linear-gradient(180deg, #1890ff 0%, #096dd9 100%)', borderRadius: 2 }} />
            <Text style={{ fontSize: 12 }}>线索数</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: 'linear-gradient(180deg, #52c41a 0%, #389e0d 100%)', borderRadius: 2 }} />
            <Text style={{ fontSize: 12 }}>报名数</Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
