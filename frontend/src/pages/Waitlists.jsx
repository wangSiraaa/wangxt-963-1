import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Tag, message, Alert, Result } from 'antd';
import { ClockCircleOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

export default function Waitlists({ role }) {
  const [waitlists, setWaitlists] = useState([]);
  const [trials, setTrials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const canOperate = role === 'admin';

  const load = async () => {
    const [wRes, tRes, cRes, cpRes] = await Promise.all([
      axios.get('/api/waitlists'),
      axios.get('/api/trials'),
      axios.get('/api/courses'),
      axios.get('/api/coupons'),
    ]);
    setWaitlists(wRes.data);
    setTrials(tRes.data);
    setCourses(cRes.data);
    setCoupons(cpRes.data);
  };

  useEffect(() => { load(); }, []);

  const visitedTrials = trials.filter(t => t.visited === 'yes');
  const fullCourses = courses.filter(c => c.status === 'full' || c.enrolled >= c.capacity);
  const activeCoupons = coupons.filter(c => c.status === 'active');

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
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
      await axios.post(`/api/waitlists/${id}/convert`);
      message.success('候补转正成功！');
      load();
    } catch (e) {
      message.error(e.response?.data?.error || '转正失败');
    }
  };

  const statusMap = { waiting: { text: '候补中', color: 'orange' }, converted: { text: '已转正', color: 'green' }, cancelled: { text: '已取消', color: 'default' } };

  const columns = [
    { title: '学员', dataIndex: 'student_name', key: 'name' },
    { title: '课程', dataIndex: 'course_name', key: 'course' },
    { title: '排队序号', dataIndex: 'position', key: 'pos', render: v => <Tag color="blue">第{v}位</Tag> },
    { title: '优惠券', dataIndex: 'coupon_code', key: 'coupon', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '优惠金额', dataIndex: 'discount_amount', key: 'disc', render: v => v > 0 ? <span style={{ color: '#f5222d' }}>¥{v}</span> : '-' },
    { title: '经办人', dataIndex: 'operator', key: 'op' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: v => {
        const s = statusMap[v] || { text: v, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: '加入时间', dataIndex: 'created_at', key: 'cat', render: v => dayjs(v).format('MM-DD HH:mm') },
    {
      title: '操作', key: 'action',
      render: (_, record) => {
        if (record.status !== 'waiting') return '-';
        const course = courses.find(c => c.id === record.course_id);
        const canConvert = course && course.enrolled < course.capacity;
        return canOperate ? (
          <Button
            size="small"
            type="primary"
            icon={<SwapOutlined />}
            disabled={!canConvert}
            onClick={() => handleConvert(record.id)}
          >
            {canConvert ? '转正' : '仍满班'}
          </Button>
        ) : null;
      },
    },
  ];

  return (
    <div>
      <Alert
        message="课程满班时学员只能进入候补，当有名额空出时可以办理转正"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: '#666' }}>
          共 {waitlists.length} 条候补记录，其中 {waitlists.filter(w => w.status === 'waiting').length} 条候补中
        </span>
        {canOperate && (
          <Button type="primary" icon={<ClockCircleOutlined />} onClick={() => setModalOpen(true)}>
            加入候补
          </Button>
        )}
      </div>

      <Table dataSource={waitlists} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />

      <Modal
        title="加入候补"
        open={modalOpen}
        onOk={handleAdd}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="确认加入候补"
        cancelText="取消"
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
    </div>
  );
}
