import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Tag, message, Alert, Descriptions, Steps, Result } from 'antd';
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

export default function Enrollments({ role }) {
  const [enrollments, setEnrollments] = useState([]);
  const [trials, setTrials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [form] = Form.useForm();
  const canEnroll = role === 'admin';

  const load = async () => {
    const [eRes, tRes, cRes, cpRes] = await Promise.all([
      axios.get('/api/enrollments'),
      axios.get('/api/trials'),
      axios.get('/api/courses'),
      axios.get('/api/coupons'),
    ]);
    setEnrollments(eRes.data);
    setTrials(tRes.data);
    setCourses(cRes.data);
    setCoupons(cpRes.data);
  };

  useEffect(() => { load(); }, []);

  const visitedTrials = trials.filter(t => t.visited === 'yes');
  const activeCoupons = coupons.filter(c => c.status === 'active');

  const handleCheck = async () => {
    try {
      const values = await form.validateFields(['trial_id', 'course_id']);
      const trial = trials.find(t => t.id === values.trial_id);
      const res = await axios.post('/api/enrollments/check', {
        trial_id: values.trial_id,
        course_id: values.course_id,
      });
      setCheckResult({ ...res.data, student_name: trial?.student_name });
    } catch (e) {
      if (e.response) {
        setCheckResult(e.response.data);
      }
    }
  };

  const handleEnroll = async () => {
    try {
      const values = await form.getFieldsValue();
      const trial = trials.find(t => t.id === values.trial_id);
      const course = courses.find(c => c.id === values.course_id);
      const coupon = values.coupon_id ? coupons.find(c => c.id === values.coupon_id) : null;

      const original_fee = 3000;
      const discount_amount = coupon ? coupon.amount : 0;
      const final_fee = original_fee - discount_amount;

      await axios.post('/api/enrollments', {
        trial_id: values.trial_id,
        student_name: trial?.student_name,
        course_id: values.course_id,
        coupon_id: values.coupon_id || null,
        coupon_code: coupon?.code || null,
        discount_amount,
        original_fee,
        final_fee,
        operator: '教务张老师',
      });
      message.success('报名成功！');
      setModalOpen(false);
      setCheckResult(null);
      form.resetFields();
      load();
    } catch (e) {
      message.error(e.response?.data?.error || '报名失败');
    }
  };

  const handleToWaitlist = async () => {
    try {
      const values = await form.getFieldsValue();
      const trial = trials.find(t => t.id === values.trial_id);
      const coupon = values.coupon_id ? coupons.find(c => c.id === values.coupon_id) : null;

      await axios.post('/api/waitlists', {
        trial_id: values.trial_id,
        student_name: trial?.student_name,
        course_id: values.course_id,
        coupon_id: values.coupon_id || null,
        coupon_code: coupon?.code || null,
        discount_amount: coupon ? coupon.amount : 0,
        operator: '教务张老师',
      });
      message.success('已加入候补列表！');
      setModalOpen(false);
      setCheckResult(null);
      form.resetFields();
      load();
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败');
    }
  };

  const columns = [
    { title: '学员', dataIndex: 'student_name', key: 'name' },
    { title: '课程', dataIndex: 'course_name', key: 'course' },
    {
      title: '原价', dataIndex: 'original_fee', key: 'orig',
      render: v => v ? `¥${v}` : '-',
    },
    {
      title: '优惠', dataIndex: 'discount_amount', key: 'disc',
      render: v => v > 0 ? <Tag color="red">-¥{v}</Tag> : '-',
    },
    {
      title: '实付', dataIndex: 'final_fee', key: 'final',
      render: v => <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{v}</span>,
    },
    { title: '优惠券', dataIndex: 'coupon_code', key: 'coupon', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '经办人', dataIndex: 'operator', key: 'op' },
    { title: '报名时间', dataIndex: 'created_at', key: 'cat', render: v => dayjs(v).format('MM-DD HH:mm') },
  ];

  return (
    <div>
      <Alert
        message="报名规则：试听未到访不能转正；课程满班只能进入候补；过期优惠券不能抵扣"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: '#666' }}>共 {enrollments.length} 条报名记录</span>
        {canEnroll && (
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setModalOpen(true)}>
            办理报名
          </Button>
        )}
      </div>

      <Table dataSource={enrollments} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />

      <Modal
        title="办理报名"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setCheckResult(null); form.resetFields(); }}
        width={640}
        footer={
          checkResult && checkResult.can_enroll && !checkResult.is_waitlist
            ? [
                <Button key="cancel" onClick={() => { setModalOpen(false); setCheckResult(null); form.resetFields(); }}>取消</Button>,
                <Button key="ok" type="primary" onClick={handleEnroll}>确认报名</Button>
              ]
            : checkResult && checkResult.is_waitlist
              ? [
                  <Button key="cancel" onClick={() => { setModalOpen(false); setCheckResult(null); form.resetFields(); }}>取消</Button>,
                  <Button key="waitlist" type="primary" onClick={handleToWaitlist}>加入候补</Button>
                ]
              : [
                  <Button key="cancel" onClick={() => { setModalOpen(false); setCheckResult(null); form.resetFields(); }}>关闭</Button>
                ]
        }
      >
        <Steps current={checkResult ? 1 : 0} size="small" style={{ marginBottom: 20 }} items={[{ title: '填写信息' }, { title: '资格检查' }, { title: '确认报名' }]} />

        <Form form={form} layout="vertical">
          <Form.Item name="trial_id" label="试听记录" rules={[{ required: true, message: '请选择试听记录' }]}>
            <Select
              placeholder="选择已到访的试听学员"
              options={visitedTrials.map(t => ({ label: `${t.student_name} - ${t.course_name}`, value: t.id }))}
            />
          </Form.Item>
          <Form.Item name="course_id" label="报名课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select
              placeholder="选择报名课程"
              options={courses.map(c => ({
                label: `${c.name} (${c.enrolled}/${c.capacity}${c.status === 'full' ? ' 已满班' : ''})`,
                value: c.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="coupon_id" label="优惠券">
            <Select placeholder="选择优惠券（可选）" allowClear options={activeCoupons.map(c => ({ label: `${c.code} - ¥${c.amount} (有效期至${c.expire_date})`, value: c.id }))} />
          </Form.Item>
          <Form.Item>
            <Button onClick={handleCheck} type="primary" ghost>
              检查报名资格
            </Button>
          </Form.Item>
        </Form>

        {checkResult && (
          <div style={{ marginTop: 16 }}>
            {checkResult.errors && checkResult.errors.length > 0 && (
              <Result
                status="error"
                title="不符合报名条件"
                subTitle={checkResult.errors.map((e, i) => <div key={i}><WarningOutlined style={{ color: '#f5222d' }} /> {e}</div>)}
              />
            )}
            {checkResult.warnings && checkResult.warnings.length > 0 && checkResult.errors.length === 0 && (
              <Result
                status="warning"
                title="课程已满班，建议加入候补"
                subTitle={
                  <div>
                    {checkResult.warnings.map((w, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <WarningOutlined style={{ color: '#faad14' }} /> {w}
                      </div>
                    ))}
                    <div style={{ marginTop: 8, color: '#666' }}>
                      点击下方「加入候补」按钮，当有名额时会按顺序转正
                    </div>
                  </div>
                }
              />
            )}
            {checkResult.can_enroll && !checkResult.is_waitlist && (
              <Result
                status="success"
                title="符合报名条件"
                subTitle="可以办理正式报名"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
