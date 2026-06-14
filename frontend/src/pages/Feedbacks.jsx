import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Select, Input, Rate, Tag, message, Space, Row, Col, Descriptions, Divider } from 'antd';
import { CommentOutlined, StarOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const DIMENSION_LABELS = {
  class_performance: '课堂表现',
  learning_attitude: '学习态度',
  knowledge_mastery: '知识掌握',
  expression_ability: '表达能力',
  team_collaboration: '团队协作',
};

const RECOMMENDATION_OPTIONS = [
  { label: '强烈推荐', value: 'strongly_recommend', color: 'green' },
  { label: '推荐', value: 'recommend', color: 'blue' },
  { label: '一般', value: 'average', color: 'orange' },
  { label: '不推荐', value: 'not_recommend', color: 'red' },
];

const getRecommendationTag = (level) => {
  const item = RECOMMENDATION_OPTIONS.find(o => o.value === level);
  return item ? <Tag color={item.color}>{item.label}</Tag> : '-';
};

const calcAverageScore = (dimensions) => {
  if (!dimensions) return 0;
  const values = Object.values(dimensions).filter(v => typeof v === 'number');
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
};

export default function Feedbacks({ role }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [trials, setTrials] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [courseFilter, setCourseFilter] = useState();
  const [scoreFilter, setScoreFilter] = useState();
  const [form] = Form.useForm();
  const canSubmit = role === 'teacher' || role === 'admin';

  const load = async () => {
    const [fRes, tRes] = await Promise.all([axios.get('/api/feedbacks'), axios.get('/api/trials')]);
    setFeedbacks(fRes.data);
    setTrials(tRes.data);
  };

  useEffect(() => { load(); }, []);

  const courseOptions = useMemo(() => {
    const courses = [...new Set(trials.map(t => t.course_name).filter(Boolean))];
    return courses.map(c => ({ label: c, value: c }));
  }, [trials]);

  const scoreOptions = [
    { label: '5星', value: 5 },
    { label: '4星及以上', value: 4 },
    { label: '3星及以上', value: 3 },
    { label: '2星及以上', value: 2 },
    { label: '1星及以上', value: 1 },
  ];

  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks];
    if (role === 'teacher') {
      list = list.filter(f => f.teacher === '当前老师' || f.is_mine);
    }
    if (courseFilter) {
      list = list.filter(f => f.course_name === courseFilter);
    }
    if (scoreFilter) {
      list = list.filter(f => {
        const avg = f.overall_score || calcAverageScore(f.dimensions);
        return avg >= scoreFilter;
      });
    }
    return list;
  }, [feedbacks, role, courseFilter, scoreFilter]);

  const getFeedbackStatus = (trialId) => {
    const hasFeedback = feedbacks.some(f => f.trial_id === trialId);
    return hasFeedback
      ? { text: '已反馈', color: 'green' }
      : { text: '待反馈', color: 'orange' };
  };

  const visitedTrials = trials.filter(t => t.visited === 'yes');

  const unfeedbackTrials = useMemo(() => {
    return visitedTrials.filter(t => !feedbacks.some(f => f.trial_id === t.id));
  }, [visitedTrials, feedbacks]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const trial = trials.find(t => t.id === values.trial_id);
      const avgScore = calcAverageScore(values.dimensions);
      const recommendCourse = values.recommend_course_id ? trials.find(t => t.course_id === values.recommend_course_id) : null;
      await axios.post('/api/feedbacks', {
        trial_id: values.trial_id,
        overall_score: values.overall_score || avgScore,
        dimensions: values.dimensions,
        strengths: values.strengths,
        weaknesses: values.weaknesses,
        suggestions: values.suggestions,
        recommendation_level: values.recommendation_level,
        recommend_course_id: values.recommend_course_id || null,
        recommend_course_type: values.recommend_course_type || null,
        recommend_course_name: recommendCourse?.course_name || null,
        discount_eligibility: values.discount_eligibility || 'eligible',
        discount_eligibility_reason: values.discount_eligibility === 'eligible' ? null : values.discount_eligibility_reason,
        waitlist_priority_boost: values.waitlist_priority_boost || 0,
        student_name: trial?.student_name,
        course_name: trial?.course_name,
        teacher: values.teacher,
        trial_date: trial?.trial_date,
      });
      message.success('反馈提交成功，推荐班型、优惠资格和候补优先级已同步');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      if (e.response) message.error(e.response.data.error);
    }
  };

  const handleViewDetail = (record) => {
    setCurrentFeedback(record);
    setDetailOpen(true);
  };

  const columns = [
    {
      title: '学员姓名',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 100,
    },
    {
      title: '课程',
      dataIndex: 'course_name',
      key: 'course_name',
      width: 120,
    },
    {
      title: '授课老师',
      dataIndex: 'teacher',
      key: 'teacher',
      width: 100,
    },
    {
      title: '试听日期',
      dataIndex: 'trial_date',
      key: 'trial_date',
      width: 110,
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : '-',
    },
    {
      title: '综合评分',
      dataIndex: 'overall_score',
      key: 'overall_score',
      width: 160,
      render: (v, record) => {
        const score = v || calcAverageScore(record.dimensions);
        return (
          <Space>
            <Rate disabled value={score} style={{ fontSize: 14 }} />
            <span style={{ color: '#666' }}>{score}</span>
          </Space>
        );
      },
      sorter: (a, b) => (a.overall_score || calcAverageScore(a.dimensions)) - (b.overall_score || calcAverageScore(b.dimensions)),
    },
    {
      title: '推荐等级',
      dataIndex: 'recommendation_level',
      key: 'recommendation_level',
      width: 100,
      render: v => getRecommendationTag(v),
    },
    {
      title: '反馈状态',
      key: 'feedback_status',
      width: 90,
      render: (_, record) => {
        const status = getFeedbackStatus(record.trial_id);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ fontSize: 14, color: '#666' }}>共 {filteredFeedbacks.length} 条反馈记录</span>
        </Space>
        {canSubmit && (
          <Button type="primary" icon={<CommentOutlined />} onClick={() => setModalOpen(true)}>
            提交反馈
          </Button>
        )}
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <Select
          placeholder="按课程筛选"
          allowClear
          style={{ width: 200 }}
          value={courseFilter}
          onChange={setCourseFilter}
          options={courseOptions}
        />
        <Select
          placeholder="按评分筛选"
          allowClear
          style={{ width: 150 }}
          value={scoreFilter}
          onChange={setScoreFilter}
          options={scoreOptions}
        />
      </div>

      <Table
        dataSource={filteredFeedbacks}
        rowKey="id"
        columns={columns}
        size="middle"
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => handleViewDetail(record),
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title="反馈详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>关闭</Button>,
        ]}
        width={720}
      >
        {currentFeedback && (
          <div>
            <Descriptions title="试听学员信息" bordered column={2} size="small">
              <Descriptions.Item label="学员姓名">{currentFeedback.student_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="课程">{currentFeedback.course_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="授课老师">{currentFeedback.teacher || '-'}</Descriptions.Item>
              <Descriptions.Item label="试听日期">
                {currentFeedback.trial_date ? dayjs(currentFeedback.trial_date).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">多维度评分</Divider>
            <Row gutter={[16, 12]}>
              {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                <Col span={12} key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#666' }}>{label}</span>
                    <Space>
                      <Rate disabled value={currentFeedback.dimensions?.[key] || 0} style={{ fontSize: 14 }} />
                      <span style={{ color: '#999', fontSize: 12 }}>{currentFeedback.dimensions?.[key] || 0}分</span>
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <span style={{ color: '#666', marginRight: 8 }}>综合评分：</span>
              <Rate disabled value={currentFeedback.overall_score || calcAverageScore(currentFeedback.dimensions)} style={{ fontSize: 16 }} />
              <span style={{ marginLeft: 8, fontWeight: 'bold' }}>
                {currentFeedback.overall_score || calcAverageScore(currentFeedback.dimensions)} 分
              </span>
            </div>

            <Divider orientation="left">推荐等级</Divider>
            <div>{getRecommendationTag(currentFeedback.recommendation_level)}</div>

            <Divider orientation="left">报名影响因素</Divider>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="推荐班型">
                {currentFeedback.recommend_course_name || currentFeedback.recommend_course_type || (
                  <span style={{ color: '#999' }}>默认跟随试听课程</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="优惠资格">
                {currentFeedback.discount_eligibility === 'eligible' ? (
                  <Tag color="green">正常</Tag>
                ) : currentFeedback.discount_eligibility ? (
                  <div>
                    <Tag color="red">受限</Tag>
                    {currentFeedback.discount_eligibility_reason && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        原因：{currentFeedback.discount_eligibility_reason}
                      </div>
                    )}
                  </div>
                ) : (
                  <Tag color="green">正常</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="候补优先级加成">
                {currentFeedback.waitlist_priority_boost ? (
                  <span style={{ color: '#1677ff', fontWeight: 'bold' }}>
                    +{currentFeedback.waitlist_priority_boost * 5} 分
                  </span>
                ) : (
                  <span style={{ color: '#999' }}>无加成</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="推荐等级分值">
                <span style={{ color: '#1677ff', fontWeight: 'bold' }}>
                  +{{strongly_recommend: 30, recommend: 25, average: 15, not_recommend: 5}[currentFeedback.recommendation_level] || 0} 分
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">反馈详情</Divider>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#52c41a', fontWeight: 500, marginBottom: 4 }}>优点：</div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{currentFeedback.strengths || '-'}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#ff4d4f', fontWeight: 500, marginBottom: 4 }}>缺点：</div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{currentFeedback.weaknesses || '-'}</div>
            </div>
            <div>
              <div style={{ color: '#1890ff', fontWeight: 500, marginBottom: 4 }}>改进建议：</div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{currentFeedback.suggestions || '-'}</div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="提交课堂反馈"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="提交"
        cancelText="取消"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="trial_id" label="试听记录" rules={[{ required: true, message: '请选择试听记录' }]}>
            <Select
              placeholder="选择已到访的试听记录"
              showSearch
              optionFilterProp="label"
              options={unfeedbackTrials.map(t => ({
                label: `${t.student_name} - ${t.course_name} (${dayjs(t.trial_date).format('MM-DD')})`,
                value: t.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="teacher" label="授课老师" rules={[{ required: true, message: '请选择授课老师' }]}>
                <Select
                  placeholder="选择授课老师"
                  options={[
                    { label: '王老师', value: '王老师' },
                    { label: '李老师', value: '李老师' },
                    { label: '张老师', value: '张老师' },
                    { label: '陈老师', value: '陈老师' },
                    { label: '赵老师', value: '赵老师' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="recommendation_level" label="推荐等级" rules={[{ required: true, message: '请选择推荐等级' }]}>
                <Select
                  placeholder="选择推荐等级"
                  options={RECOMMENDATION_OPTIONS}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">多维度评分</Divider>
          {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
            <Form.Item
              key={key}
              name={['dimensions', key]}
              label={label}
              rules={[{ required: true, message: `请为${label}评分` }]}
            >
              <Rate />
            </Form.Item>
          ))}

          <Divider orientation="left">报名影响设置</Divider>
          <Alert
            message="以下设置将直接影响学员的报名资格、推荐班型和候补排序优先级"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="recommend_course_type" label="推荐班型">
                <Select
                  placeholder="选择推荐班型（可选）"
                  allowClear
                  options={[
                    { label: '基础班', value: 'basic' },
                    { label: '提高班', value: 'advanced' },
                    { label: '精英班', value: 'elite' },
                    { label: '一对一', value: 'one_on_one' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="waitlist_priority_boost" label="候补优先级加成">
                <Select
                  placeholder="选择优先级加成（可选）"
                  allowClear
                  options={[
                    { label: '不加成', value: 0 },
                    { label: '+5分（轻微加成）', value: 1 },
                    { label: '+10分（中等加成）', value: 2 },
                    { label: '+15分（较高加成）', value: 3 },
                    { label: '+20分（高加成）', value: 4 },
                    { label: '+25分（极高加成）', value: 5 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount_eligibility" label="优惠资格" initialValue="eligible">
                <Select
                  placeholder="选择优惠资格"
                  options={[
                    { label: '正常（可使用优惠）', value: 'eligible' },
                    { label: '受限（不可使用优惠）', value: 'restricted' },
                    { label: '需审批（优惠需审核）', value: 'need_approval' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.discount_eligibility !== curr.discount_eligibility}
              >
                {({ getFieldValue }) => {
                  const eligibility = getFieldValue('discount_eligibility');
                  if (eligibility === 'eligible') return null;
                  return (
                    <Form.Item
                      name="discount_eligibility_reason"
                      label="受限原因"
                      rules={[{ required: true, message: '请输入受限原因' }]}
                    >
                      <Input.TextArea rows={1} placeholder="请说明优惠资格受限的原因" />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">反馈内容</Divider>
          <Form.Item name="strengths" label="优点" rules={[{ required: true, message: '请输入优点' }]}>
            <Input.TextArea rows={2} placeholder="请描述学员的优点" />
          </Form.Item>
          <Form.Item name="weaknesses" label="缺点" rules={[{ required: true, message: '请输入缺点' }]}>
            <Input.TextArea rows={2} placeholder="请描述学员的不足" />
          </Form.Item>
          <Form.Item name="suggestions" label="改进建议" rules={[{ required: true, message: '请输入改进建议' }]}>
            <Input.TextArea rows={3} placeholder="请给出改进建议" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
