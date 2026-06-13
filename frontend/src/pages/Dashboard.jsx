import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography, Alert, List, Progress, Divider, Space } from 'antd';
import {
  UserOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  RiseOutlined,
  BellOutlined,
  BookOutlined,
  StarOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export default function Dashboard({ role }) {
  const [stats, setStats] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [rules, setRules] = useState([]);
  const [todayTrials, setTodayTrials] = useState([]);
  const [pendingFollowUps, setPendingFollowUps] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [waitlistOverview, setWaitlistOverview] = useState([]);
  const [teacherFeedbacks, setTeacherFeedbacks] = useState([]);
  const [teacherRatings, setTeacherRatings] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, funnelRes, rulesRes] = await Promise.all([
          axios.get('/api/dashboard/stats'),
          axios.get('/api/funnel'),
          axios.get('/api/rule-explanations'),
        ]);
        setStats(statsRes.data);
        
        const funnelRaw = funnelRes.data;
        const funnelStagesData = [
          { name: '线索池', value: funnelRaw.leads, rate: '100%' },
          { name: '预约试听', value: funnelRaw.trial_scheduled, rate: funnelRaw.leads > 0 ? ((funnelRaw.trial_scheduled / funnelRaw.leads) * 100).toFixed(1) + '%' : '0%' },
          { name: '实际到访', value: funnelRaw.visited, rate: funnelRaw.trial_scheduled > 0 ? ((funnelRaw.visited / funnelRaw.trial_scheduled) * 100).toFixed(1) + '%' : '0%' },
          { name: '完成反馈', value: funnelRaw.feedback_done, rate: funnelRaw.visited > 0 ? ((funnelRaw.feedback_done / funnelRaw.visited) * 100).toFixed(1) + '%' : '0%' },
          { name: '正式报名', value: funnelRaw.enrolled, rate: funnelRaw.feedback_done > 0 ? ((funnelRaw.enrolled / funnelRaw.feedback_done) * 100).toFixed(1) + '%' : '0%' },
        ];
        setFunnelData({
          stages: funnelStagesData,
          overallConversion: funnelRaw.leads > 0 ? ((funnelRaw.enrolled / funnelRaw.leads) * 100).toFixed(1) + '%' : '0%',
          last7Days: funnelRaw.last7Days,
        });
        setRules(rulesRes.data);

        if (role === 'consultant') {
          const [trialsRes, followUpsRes] = await Promise.all([
            axios.get('/api/trials', { params: { date: dayjs().format('YYYY-MM-DD') } }),
            axios.get('/api/follow-up-plans'),
          ]);
          setTodayTrials(trialsRes.data);
          const pending = followUpsRes.data.filter(f => f.status === 'pending' && dayjs(f.plan_date).isBefore(dayjs().add(1, 'day')));
          setPendingFollowUps(pending);
        }

        if (role === 'teacher') {
          const [trialsRes, feedbacksRes] = await Promise.all([
            axios.get('/api/trials', { params: { date: dayjs().format('YYYY-MM-DD') } }),
            axios.get('/api/feedbacks'),
          ]);
          setTodayTrials(trialsRes.data);
          setTeacherFeedbacks(feedbacksRes.data.slice(0, 5));
          
          const ratings = feedbacksRes.data.map(f => f.rating || 0);
          const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
          setTeacherRatings({
            total: feedbacksRes.data.length,
            average: avgRating,
            fiveStar: ratings.filter(r => r === 5).length,
            fourStar: ratings.filter(r => r === 4).length,
          });
        }

        if (role === 'admin') {
          const [enrollmentsRes, waitlistsRes, trialsRes] = await Promise.all([
            axios.get('/api/enrollments'),
            axios.get('/api/waitlists'),
            axios.get('/api/trials', { params: { date: dayjs().format('YYYY-MM-DD') } }),
          ]);
          const pending = enrollmentsRes.data.filter(e => e.approval_status === 'pending');
          setPendingApprovals(pending);
          setWaitlistOverview(waitlistsRes.data.filter(w => w.status === 'waiting').slice(0, 5));
          setTodayTrials(trialsRes.data);
        }
      } catch (e) {
        console.error('加载数据失败', e);
      }
    };
    loadData();
  }, [role]);

  if (!stats || !funnelData) return <div>加载中...</div>;

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

  const funnelStages = funnelData.stages.slice(0, 5);

  const importantRules = rules.filter(r => 
    r.category === '报名规则' || r.category === '候补规则'
  ).slice(0, 3);

  const renderConsultantDashboard = () => (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="我的线索"
              value={stats.leads}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="待跟进"
              value={pendingFollowUps.length}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="今日到访"
              value={todayTrials.filter(t => t.visited === 'yes').length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="个人转化率"
              value={stats.conversionRate}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="待跟进提醒" size="small" extra={<Tag color="orange">{pendingFollowUps.length}条</Tag>}>
            <List
              size="small"
              dataSource={pendingFollowUps.slice(0, 5)}
              locale={{ emptyText: '暂无待跟进事项' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text strong>计划跟进：{dayjs(item.plan_date).format('MM-DD')}</Text>}
                    description={item.plan_content}
                  />
                  <Tag color="orange">待跟进</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最近到访安排" size="small" extra={<Tag color="blue">{todayTrials.length}节</Tag>}>
            <List
              size="small"
              dataSource={todayTrials.slice(0, 5)}
              locale={{ emptyText: '今日暂无试听安排' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.student_name}
                    description={`${item.course_name} · ${item.trial_time || '待定'}`}
                  />
                  <Tag color={item.visited === 'yes' ? 'green' : 'default'}>
                    {item.visited === 'yes' ? '已到访' : '待到访'}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderTeacherDashboard = () => (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="今日课程"
              value={todayTrials.length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="待反馈学员"
              value={todayTrials.filter(t => t.feedback_status === 'pending' && t.visited === 'yes').length}
              prefix={<CommentOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="平均评分"
              value={teacherRatings?.average || 0}
              suffix="分"
              prefix={<StarOutlined />}
              valueStyle={{ color: '#fadb14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="总反馈数"
              value={teacherRatings?.total || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="今日课程表" size="small" extra={<Tag color="blue">{todayTrials.length}节</Tag>}>
            <List
              size="small"
              dataSource={todayTrials}
              locale={{ emptyText: '今日暂无课程' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.student_name}
                    description={
                      <Space>
                        <span>{item.course_name}</span>
                        <span>{item.trial_time || '待定'}</span>
                      </Space>
                    }
                  />
                  <Tag color={item.feedback_status === 'completed' ? 'green' : 'orange'}>
                    {item.feedback_status === 'completed' ? '已反馈' : '待反馈'}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="我的评分统计" size="small">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#fadb14' }}>
                {teacherRatings?.average || 0}
              </Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                / 5.0
              </Text>
              <div style={{ marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <StarOutlined
                    key={star}
                    style={{
                      color: star <= Math.round(teacherRatings?.average || 0) ? '#fadb14' : '#d9d9d9',
                      fontSize: 20,
                    }}
                  />
                ))}
              </div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <Row gutter={8}>
              <Col span={12} style={{ textAlign: 'center' }}>
                <Text type="secondary">5星好评</Text>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                  {teacherRatings?.fiveStar || 0}
                </div>
              </Col>
              <Col span={12} style={{ textAlign: 'center' }}>
                <Text type="secondary">4星好评</Text>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                  {teacherRatings?.fourStar || 0}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderAdminDashboard = () => (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="待报名审批"
              value={pendingApprovals.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="候补队列"
              value={stats.waitlists}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="今日到访"
              value={todayTrials.filter(t => t.visited === 'yes').length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="整体转化率"
              value={funnelData.overallConversion}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="待报名审批" size="small" extra={<Tag color="orange">{pendingApprovals.length}条</Tag>}>
            <List
              size="small"
              dataSource={pendingApprovals.slice(0, 5)}
              locale={{ emptyText: '暂无待审批报名' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.student_name}
                    description={`${item.course_name} · ${dayjs(item.created_at).format('MM-DD HH:mm')}`}
                  />
                  <Tag color="orange">待审批</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="候补队列概览" size="small" extra={<Tag color="pink">{stats.waitlists}人</Tag>}>
            <List
              size="small"
              dataSource={waitlistOverview}
              locale={{ emptyText: '暂无候补学员' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.student_name}
                    description={`${item.course_name} · 第${item.position}位`}
                  />
                  <Tag color="pink">候补中</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderFunnelOverview = () => (
    <Card title="转正漏斗简览" size="small" style={{ marginBottom: 24 }} extra={<Tag color="blue">整体转化 {funnelData.overallConversion}</Tag>}>
      <Row gutter={[16, 16]} align="middle">
        {funnelStages.map((stage, index) => (
          <Col span={index === funnelStages.length - 1 ? 4 : 5} key={stage.name}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: 60 + (funnelStages.length - index) * 10,
                  background: `linear-gradient(135deg, #1890ff ${index * 15}%, #722ed1 100%)`,
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#fff',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{stage.value}</Text>
                <Text type="secondary" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                  {stage.name}
                </Text>
              </div>
              <Progress
                percent={parseFloat(stage.rate) || 0}
                size="small"
                status="active"
                strokeColor={{ from: '#1890ff', to: '#722ed1' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                转化率 {stage.rate}
              </Text>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );

  const renderRuleReminders = () => (
    <Card
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#fa8c16' }} />
          <span>重要业务规则提醒</span>
        </Space>
      }
      size="small"
      type="inner"
    >
      <List
        size="small"
        dataSource={importantRules}
        renderItem={item => (
          <List.Item>
            <Alert
              message={
                <Space>
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  <Text strong>{item.rule_name}</Text>
                </Space>
              }
              description={item.description}
              type="info"
              showIcon={false}
              style={{ width: '100%', border: 'none', background: 'transparent', padding: 0 }}
            />
          </List.Item>
        )}
      />
    </Card>
  );

  return (
    <div>
      <Alert
        message={roleHint[role]}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {role === 'consultant' && renderConsultantDashboard()}
      {role === 'teacher' && renderTeacherDashboard()}
      {role === 'admin' && renderAdminDashboard()}

      {renderFunnelOverview()}

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
          {role === 'teacher' ? (
            <Card title="最近反馈" size="small">
              <List
                size="small"
                dataSource={teacherFeedbacks}
                locale={{ emptyText: '暂无反馈记录' }}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.student_name}</span>
                          <span>
                            {[1, 2, 3, 4, 5].map(star => (
                              <StarOutlined
                                key={star}
                                style={{
                                  color: star <= (item.rating || 0) ? '#fadb14' : '#d9d9d9',
                                  fontSize: 12,
                                }}
                              />
                            ))}
                          </span>
                        </Space>
                      }
                      description={item.content ? item.content.substring(0, 50) + '...' : '暂无评价内容'}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.created_at).format('MM-DD')}
                    </Text>
                  </List.Item>
                )}
              />
            </Card>
          ) : (
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
          )}
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        {renderRuleReminders()}
      </div>
    </div>
  );
}
