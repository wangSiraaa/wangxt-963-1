import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Select, Tag, message, Alert, Result, Card, Row, Col, Statistic, Space, Divider, Descriptions, Tooltip } from 'antd';
import { ClockCircleOutlined, SwapOutlined, WarningOutlined, InfoCircleOutlined, FilterOutlined, ReloadOutlined, PlayCircleOutlined, EyeOutlined, QuestionCircleOutlined, TeamOutlined, UserAddOutlined, CheckCircleOutlined, ClockCircleFilled } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

export default function Waitlists({ role }) {
  const [waitlists, setWaitlists] = useState([]);
  const [trials, setTrials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [form] = Form.useForm();
  const canOperate = role === 'admin';

  const [filters, setFilters] = useState({
    course_id: undefined,
    campus_id: undefined,
    status: undefined,
  });

  const load = async () => {
    const params = {};
    if (filters.course_id) params.course_id = filters.course_id;
    if (filters.campus_id) params.campus_id = filters.campus_id;
    if (filters.status) params.status = filters.status;

    const [wRes, tRes, cRes, cpRes, campRes] = await Promise.all([
      axios.get('/api/waitlists', { params }),
      axios.get('/api/trials'),
      axios.get('/api/courses'),
      axios.get('/api/coupons'),
      axios.get('/api/campuses'),
    ]);
    setWaitlists(wRes.data);
    setTrials(tRes.data);
    setCourses(cRes.data);
    setCoupons(cpRes.data);
    setCampuses(campRes.data);
  };

  useEffect(() => { load(); }, [filters]);

  const visitedTrials = trials.filter(t => t.visited === 'yes');
  const fullCourses = courses.filter(c => c.status === 'full' || c.enrolled >= c.capacity);
  const activeCoupons = coupons.filter(c => c.status === 'active');

  const stats = useMemo(() => {
    const total = waitlists.length;
    const today = dayjs().format('YYYY-MM-DD');
    const todayNew = waitlists.filter(w => dayjs(w.created_at).format('YYYY-MM-DD') === today).length;
    const promoted = waitlists.filter(w => w.status === 'converted').length;
    const waitingList = waitlists.filter(w => w.status === 'waiting');
    const avgWaitDays = waitingList.length > 0
      ? (waitingList.reduce((sum, w) => sum + dayjs().diff(dayjs(w.enroll_time || w.created_at), 'day'), 0) / waitingList.length).toFixed(1)
      : 0;
    return { total, todayNew, promoted, avgWaitDays };
  }, [waitlists]);

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      const trial = trials.find(t => t.id === values.trial_id);
      const coupon = values.coupon_id ? coupons.find(c => c.id === values.coupon_id) : null;
      const course = courses.find(c => c.id === values.course_id);

      await axios.post('/api/waitlists', {
        trial_id: values.trial_id,
        lead_id: trial?.lead_id,
        student_name: trial?.student_name,
        course_id: values.course_id,
        campus_id: course?.campus_id,
        campus_name: course?.campus_name,
        course_priority: course?.priority,
        coupon_id: values.coupon_id || null,
        coupon_code: coupon?.code || null,
        discount_amount: coupon ? coupon.amount : 0,
        coupon_expire_date: coupon?.expire_date,
        operator: '教务张老师',
        consultant: trial?.consultant,
      });
      message.success('已加入候补列表');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败');
    }
  };

  const handleConvert = async (id) => {
    try {
      Modal.confirm({
        title: '确认转正',
        content: '确定要将该候补学员转为正式学员吗？',
        okText: '确认转正',
        cancelText: '取消',
        onOk: async () => {
          await axios.post(`/api/waitlists/${id}/convert`, { operator: '教务张老师' });
          message.success('候补转正成功！');
          load();
        },
      });
    } catch (e) {
      message.error(e.response?.data?.error || '转正失败');
    }
  };

  const handleAutoPromote = async () => {
    if (!filters.course_id) {
      message.warning('请先选择课程后再执行自动转正');
      return;
    }
    try {
      Modal.confirm({
        title: '自动转正',
        content: '系统将按候补排序分数从高到低自动转正有空位的学员，确定执行吗？',
        okText: '执行自动转正',
        cancelText: '取消',
        onOk: async () => {
          const res = await axios.post('/api/waitlists/auto-convert', {
            course_id: filters.course_id,
            operator: '教务张老师',
          });
          message.success(`自动转正完成，共转正 ${res.data.converted} 人`);
          load();
        },
      });
    } catch (e) {
      message.error(e.response?.data?.error || '自动转正失败');
    }
  };

  const handleViewDetail = async (record) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const statusMap = {
    waiting: { text: '候补中', color: 'orange' },
    converted: { text: '已转正', color: 'green' },
    cancelled: { text: '已取消', color: 'default' },
  };

  const priorityTag = (priority) => {
    if (priority >= 4) return <Tag color="red">高优先级</Tag>;
    if (priority >= 2) return <Tag color="orange">中优先级</Tag>;
    return <Tag color="default">普通</Tag>;
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'position',
      key: 'position',
      width: 80,
      render: (v, record) => record.status === 'waiting'
        ? <Tag color="blue" style={{ fontWeight: 'bold' }}>第{v}位</Tag>
        : '-',
      sorter: (a, b) => (a.position || 0) - (b.position || 0),
    },
    {
      title: '排序分数',
      dataIndex: 'sort_score',
      key: 'sort_score',
      width: 100,
      render: (v) => (
        <Tooltip title="分数越高，转正优先级越高">
          <span style={{ fontWeight: 'bold', color: '#1677ff' }}>{v?.toFixed(1) || 0}</span>
        </Tooltip>
      ),
      sorter: (a, b) => (a.sort_score || 0) - (b.sort_score || 0),
      defaultSortOrder: 'descend',
    },
    { title: '学员', dataIndex: 'student_name', key: 'name', width: 100 },
    {
      title: '课程',
      dataIndex: 'course_name',
      key: 'course',
      width: 160,
      render: (v, record) => (
        <Space direction="vertical" size={0}>
          <span>{v}</span>
          <span style={{ fontSize: 12, color: '#999' }}>{record.campus_name}</span>
        </Space>
      ),
    },
    {
      title: '课程优先级',
      dataIndex: 'course_priority',
      key: 'course_priority',
      width: 100,
      render: (v) => priorityTag(v || 0),
    },
    {
      title: '优惠券',
      dataIndex: 'coupon_code',
      key: 'coupon',
      width: 120,
      render: (v, record) => (
        <Space direction="vertical" size={0}>
          {v ? <Tag color="blue">{v}</Tag> : '-'}
          {record.coupon_expire_date && (
            <span style={{ fontSize: 12, color: dayjs(record.coupon_expire_date).isBefore(dayjs()) ? '#ff4d4f' : '#999' }}>
              {dayjs(record.coupon_expire_date).format('MM-DD')}到期
            </span>
          )}
        </Space>
      ),
    },
    { title: '优惠金额', dataIndex: 'discount_amount', key: 'disc', width: 100, render: v => v > 0 ? <span style={{ color: '#f5222d' }}>¥{v}</span> : '-' },
    { title: '经办人', dataIndex: 'operator', key: 'op', width: 100 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: v => {
        const s = statusMap[v] || { text: v, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '报名时间', dataIndex: 'enroll_time', key: 'enroll_time', width: 140,
      render: (v, record) => dayjs(v || record.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '等待天数',
      key: 'wait_days',
      width: 90,
      render: (_, record) => {
        if (record.status !== 'waiting') return '-';
        const days = dayjs().diff(dayjs(record.enroll_time || record.created_at), 'day');
        return <span style={{ color: days > 7 ? '#fa8c16' : '#52c41a' }}>{days}天</span>;
      },
    },
    {
      title: '操作', key: 'action', width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'waiting' && canOperate && (
            <>
              {(() => {
                const course = courses.find(c => c.id === record.course_id);
                const canConvert = course && course.enrolled < course.capacity;
                return (
                  <Button
                    size="small"
                    type="primary"
                    icon={<SwapOutlined />}
                    disabled={!canConvert}
                    onClick={() => handleConvert(record.id)}
                  >
                    {canConvert ? '转正' : '仍满班'}
                  </Button>
                );
              })()}
            </>
          )}
        </Space>
      ),
    },
  ];

  const getCourseAvailableSpots = () => {
    if (!filters.course_id) return null;
    const course = courses.find(c => c.id === filters.course_id);
    if (!course) return null;
    return course.capacity - course.enrolled;
  };

  const availableSpots = getCourseAvailableSpots();

  return (
    <div>
      <Alert
        message="课程满班时学员只能进入候补，当有名额空出时可以办理转正"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总候补人数"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日新增候补"
              value={stats.todayNew}
              prefix={<UserAddOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已转正人数"
              value={stats.promoted}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均等待天数"
              value={stats.avgWaitDays}
              suffix="天"
              prefix={<ClockCircleFilled style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Space size="small">
            <FilterOutlined style={{ color: '#666' }} />
            <span style={{ color: '#666' }}>筛选：</span>
          </Space>
          <Select
            placeholder="全部课程"
            style={{ width: 200 }}
            allowClear
            value={filters.course_id}
            onChange={(v) => setFilters(f => ({ ...f, course_id: v }))}
            options={courses.map(c => ({
              label: `${c.name} (${c.enrolled}/${c.capacity})`,
              value: c.id,
            }))}
          />
          <Select
            placeholder="全部校区"
            style={{ width: 150 }}
            allowClear
            value={filters.campus_id}
            onChange={(v) => setFilters(f => ({ ...f, campus_id: v }))}
            options={campuses.map(c => ({ label: c.name, value: c.id }))}
          />
          <Select
            placeholder="全部状态"
            style={{ width: 120 }}
            allowClear
            value={filters.status}
            onChange={(v) => setFilters(f => ({ ...f, status: v }))}
            options={[
              { label: '候补中', value: 'waiting' },
              { label: '已转正', value: 'converted' },
              { label: '已取消', value: 'cancelled' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => setRuleModalOpen(true)}
          >
            排序规则说明
          </Button>
        </Space>
      </Card>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ fontSize: 14, color: '#666' }}>
            共 {waitlists.length} 条候补记录，其中 {waitlists.filter(w => w.status === 'waiting').length} 条候补中
          </span>
          {availableSpots !== null && (
            <Tag color={availableSpots > 0 ? 'green' : 'red'}>
              当前课程剩余 {availableSpots} 个名额
            </Tag>
          )}
        </Space>
        <Space>
          {canOperate && filters.course_id && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleAutoPromote}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              自动转正
            </Button>
          )}
          {canOperate && (
            <Button type="primary" icon={<ClockCircleOutlined />} onClick={() => setModalOpen(true)}>
              加入候补
            </Button>
          )}
        </Space>
      </div>

      <Table
        dataSource={waitlists}
        rowKey="id"
        columns={columns}
        size="middle"
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="加入候补"
        open={modalOpen}
        onOk={handleAdd}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="确认加入候补"
        cancelText="取消"
        width={520}
      >
        <Alert
          message="课程满班只能进入候补，过期优惠券不能抵扣"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Form.Item name="trial_id" label="试听记录" rules={[{ required: true, message: '请选择试听记录' }]}>
            <Select
              placeholder="选择已到访的试听学员"
              showSearch
              optionFilterProp="label"
              options={visitedTrials.map(t => ({ label: `${t.student_name} - ${t.course_name}`, value: t.id }))}
            />
          </Form.Item>
          <Form.Item name="course_id" label="候补课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select
              placeholder="选择满班课程"
              options={fullCourses.map(c => ({
                label: `${c.name} (${c.enrolled}/${c.capacity} 已满)`,
                value: c.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="coupon_id" label="优惠券">
            <Select
              placeholder="选择优惠券（可选，过期券不可用）"
              allowClear
              options={activeCoupons.map(c => ({ label: `${c.code} - ¥${c.amount} (有效期至${c.expire_date})`, value: c.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="候补详情"
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailRecord(null); }}
        footer={null}
        width={680}
      >
        {detailRecord && (
          <div>
            <Descriptions title="基本信息" bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学员姓名">{detailRecord.student_name}</Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={statusMap[detailRecord.status]?.color || 'default'}>
                  {statusMap[detailRecord.status]?.text || detailRecord.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="候补课程">{detailRecord.course_name}</Descriptions.Item>
              <Descriptions.Item label="所属校区">{detailRecord.campus_name}</Descriptions.Item>
              <Descriptions.Item label="排序位置">
                {detailRecord.status === 'waiting' ? `第 ${detailRecord.position} 位` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="排序分数">
                <span style={{ color: '#1677ff', fontWeight: 'bold' }}>
                  {detailRecord.sort_score?.toFixed(1) || 0} 分
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="课程优先级">
                {priorityTag(detailRecord.course_priority || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="经办人">{detailRecord.operator || '-'}</Descriptions.Item>
              <Descriptions.Item label="顾问老师">{detailRecord.consultant || '-'}</Descriptions.Item>
              <Descriptions.Item label="报名时间">
                {dayjs(detailRecord.enroll_time || detailRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ margin: '16px 0' }}>优惠信息</Divider>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="优惠券码">
                {detailRecord.coupon_code ? <Tag color="blue">{detailRecord.coupon_code}</Tag> : '无'}
              </Descriptions.Item>
              <Descriptions.Item label="优惠金额">
                {detailRecord.discount_amount > 0
                  ? <span style={{ color: '#f5222d' }}>¥{detailRecord.discount_amount}</span>
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="优惠有效期">
                {detailRecord.coupon_expire_date
                  ? dayjs(detailRecord.coupon_expire_date).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="等待天数">
                {detailRecord.status === 'waiting'
                  ? `${dayjs().diff(dayjs(detailRecord.enroll_time || detailRecord.created_at), 'day')} 天`
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ margin: '16px 0' }}>课程信息</Divider>
            {(() => {
              const course = courses.find(c => c.id === detailRecord.course_id);
              if (!course) return null;
              return (
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="课程名称">{course.name}</Descriptions.Item>
                  <Descriptions.Item label="授课老师">{course.teacher_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="上课时间">{course.schedule || '-'}</Descriptions.Item>
                  <Descriptions.Item label="课程容量">{course.capacity} 人</Descriptions.Item>
                  <Descriptions.Item label="已报名人数">{course.enrolled} 人</Descriptions.Item>
                  <Descriptions.Item label="课程费用">¥{course.fee || 0}</Descriptions.Item>
                </Descriptions>
              );
            })()}

            {canOperate && detailRecord.status === 'waiting' && (
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setDetailOpen(false)}>关闭</Button>
                  {(() => {
                    const course = courses.find(c => c.id === detailRecord.course_id);
                    const canConvert = course && course.enrolled < course.capacity;
                    return (
                      <Button
                        type="primary"
                        icon={<SwapOutlined />}
                        disabled={!canConvert}
                        onClick={() => {
                          handleConvert(detailRecord.id);
                          setDetailOpen(false);
                        }}
                      >
                        {canConvert ? '办理转正' : '课程仍满班'}
                      </Button>
                    );
                  })()}
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
            候补排序规则说明
          </Space>
        }
        open={ruleModalOpen}
        onCancel={() => setRuleModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setRuleModalOpen(false)}>
            我知道了
          </Button>,
        ]}
        width={600}
      >
        <div style={{ lineHeight: 1.8 }}>
          <Alert
            message="候补转正顺序按综合得分从高到低排列，得分相同则按报名时间先后排序"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <h4 style={{ marginBottom: 8 }}>计分规则：</h4>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <strong>报名时间（最高60分）：</strong>
              <br />
              报名越早得分越高，30天内的报名每天计2分。
              <br />
              <span style={{ color: '#666', fontSize: 12 }}>
                例如：3天前报名得 54 分，当天报名得 60 分
              </span>
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>课程优先级（最高50分）：</strong>
              <br />
              课程优先级等级 × 10分。
              <br />
              <span style={{ color: '#666', fontSize: 12 }}>
                例如：优先级5的课程得 50 分，优先级3的课程得 30 分
              </span>
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>优惠有效期（最高20分）：</strong>
              <br />
              优惠券即将到期可获得额外加分：
              <ul style={{ paddingLeft: 20 }}>
                <li>7天内到期：加 20 分</li>
                <li>14天内到期：加 10 分</li>
              </ul>
              <span style={{ color: '#666', fontSize: 12 }}>
                目的：优先处理优惠即将过期的学员，减少优惠流失
              </span>
            </li>
          </ul>

          <Divider />

          <h4 style={{ marginBottom: 8 }}>转正资格检查：</h4>
          <ul style={{ paddingLeft: 20 }}>
            <li>课程必须有空余名额（enrolled &lt; capacity）</li>
            <li>关联的优惠券必须在有效期内</li>
            <li>候补状态必须为"候补中"</li>
          </ul>

          <Divider />

          <Alert
            message="自动转正功能会按排序分数从高到低依次转正，直到课程满员为止。"
            type="success"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}
