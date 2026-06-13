import { useEffect, useState } from 'react';
import { Card, Collapse, Tag, Select, Typography, Space, Row, Col, Statistic } from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const statusColorMap = { active: 'green', inactive: 'default', deprecated: 'red' };
const statusTextMap = { active: '生效中', inactive: '未启用', deprecated: '已废弃' };

const categoryColorMap = {
  '报名规则': 'blue',
  '候补规则': 'purple',
  '优惠规则': 'orange',
  '试听规则': 'cyan',
  '排课规则': 'geekblue',
  '退费规则': 'red',
  '其他规则': 'default',
};

export default function RuleExplanations({ role }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadRules = async () => {
    try {
      const res = await axios.get('/api/rule-explanations');
      const data = (res.data || []).map(item => ({
        code: item.rule_code,
        title: item.rule_name,
        category: item.category,
        description: item.description,
        condition: item.condition,
        result: item.result,
        example: item.example,
        status: item.status,
      }));
      setRules(data);
    } catch (e) {
      console.error('加载规则说明失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const categories = [...new Set(rules.map(r => r.category))];

  const filteredRules = selectedCategory === 'all'
    ? rules
    : rules.filter(r => r.category === selectedCategory);

  const groupedRules = categories.reduce((acc, cat) => {
    acc[cat] = rules.filter(r => r.category === cat);
    return acc;
  }, {});

  const activeCount = rules.filter(r => r.status === 'active').length;
  const inactiveCount = rules.filter(r => r.status === 'inactive').length;
  const deprecatedCount = rules.filter(r => r.status === 'deprecated').length;

  const collapseItems = (selectedCategory === 'all' ? categories : [selectedCategory])
    .filter(cat => groupedRules[cat] && groupedRules[cat].length > 0)
    .map(cat => ({
      key: cat,
      label: (
        <Space>
          <Tag color={categoryColorMap[cat] || 'default'}>{cat}</Tag>
          <Text strong>{cat}</Text>
          <Text type="secondary">（{groupedRules[cat].length} 条）</Text>
        </Space>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupedRules[cat].map(rule => (
            <Card
              key={rule.code}
              size="small"
              variant="outlined"
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <Space wrap>
                  <Text code style={{ background: '#f0f5ff', padding: '2px 10px', borderRadius: 4, color: '#1890ff', fontSize: 12 }}>
                    {rule.code}
                  </Text>
                  <Text strong style={{ fontSize: 15 }}>{rule.title}</Text>
                </Space>
                <Tag color={statusColorMap[rule.status]} icon={rule.status === 'active' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}>
                  {statusTextMap[rule.status]}
                </Tag>
              </div>

              <Paragraph style={{ margin: '0 0 10px 0', color: '#595959', lineHeight: 1.7 }}>
                {rule.description}
              </Paragraph>

              {rule.condition && (
                <div style={{ marginBottom: 8, padding: '6px 10px', background: '#fffbe6', borderRadius: 4, borderLeft: '3px solid #faad14' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>触发条件</Text>
                  <div style={{ color: '#595959', fontSize: 13, marginTop: 2 }}>{rule.condition}</div>
                </div>
              )}

              {rule.result && (
                <div style={{ marginBottom: 8, padding: '6px 10px', background: '#f6ffed', borderRadius: 4, borderLeft: '3px solid #52c41a' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>执行结果</Text>
                  <div style={{ color: '#595959', fontSize: 13, marginTop: 2 }}>{rule.result}</div>
                </div>
              )}

              {rule.example && (
                <div style={{ padding: '6px 10px', background: '#e6f7ff', borderRadius: 4, borderLeft: '3px solid #1890ff' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>示例</Text>
                  <div style={{ color: '#595959', fontSize: 13, marginTop: 2, fontStyle: 'italic' }}>{rule.example}</div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ),
    }));

  return (
    <div>
      <Card
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <BookOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>业务规则说明</Title>
              <Text type="secondary">系统所有业务规则的详细解释与说明</Text>
            </div>
          </Space>
          <Space>
            <Text type="secondary">分类筛选：</Text>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 160 }}
              size="middle"
            >
              <Option value="all">全部分类</Option>
              {categories.map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Space>
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="生效规则"
              value={activeCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="未启用"
              value={inactiveCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="已废弃"
              value={deprecatedCount}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Collapse
          items={collapseItems}
          defaultActiveKey={selectedCategory === 'all' ? categories.slice(0, 1) : [selectedCategory]}
          size="large"
          ghost={false}
          bordered={false}
        />
        {!loading && filteredRules.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            暂无规则数据
          </div>
        )}
      </Card>
    </div>
  );
}
