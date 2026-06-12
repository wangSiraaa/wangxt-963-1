import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Input, Rate, Tag, message, Space } from 'antd';
import { CommentOutlined, StarOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

export default function Feedbacks({ role }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [trials, setTrials] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const canSubmit = role === 'teacher' || role === 'admin';

  const load = async () => {
    const [fRes, tRes] = await Promise.all([axios.get('/api/feedbacks'), axios.get('/api/trials')]);
    setFeedbacks(fRes.data);
    setTrials(tRes.data);
  };

  useEffect(() => { load(); }, []);

  const visitedTrials = trials.filter(t => t.visited === 'yes');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const trial = trials.find(t => t.id === values.trial_id);
      await axios.post('/api/feedbacks', {
        ...values,
        student_name: trial?.student_name,
        course_name: trial?.course_name,
      });
      message.success('反馈提交成功');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      if (e.response) message.error(e.response.data.error);
    }
  };

  const columns = [
    { title: '学员', dataIndex: 'student_name', key: 'name' },
    { title: '课程', dataIndex: 'course_name', key: 'course' },
    { title: '授课老师', dataIndex: 'teacher', key: 'teacher' },
    {
      title: '评分', dataIndex: 'rating', key: 'rating',
      render: v => v ? <Rate disabled value={v} style={{ fontSize: 14 }} /> : '-',
    },
    { title: '反馈内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '建议', dataIndex: 'suggestion', key: 'sug', ellipsis: true },
    { title: '提交时间', dataIndex: 'created_at', key: 'cat', render: v => dayjs(v).format('MM-DD HH:mm') },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: '#666' }}>共 {feedbacks.length} 条反馈记录</span>
        {canSubmit && (
          <Button type="primary" icon={<CommentOutlined />} onClick={() => setModalOpen(true)}>
            提交反馈
          </Button>
        )}
      </div>

      <Table dataSource={feedbacks} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />

      <Modal title="提交课堂反馈" open={modalOpen} onOk={handleSubmit} onCancel={() => { setModalOpen(false); form.resetFields(); }} okText="提交" cancelText="取消" width={560}>
        <Form form={form} layout="vertical">
          <Form.Item name="trial_id" label="试听记录" rules={[{ required: true, message: '请选择试听记录' }]}>
            <Select
              placeholder="选择已到访的试听记录"
              options={visitedTrials.map(t => ({ label: `${t.student_name} - ${t.course_name} (${t.trial_date})`, value: t.id }))}
            />
          </Form.Item>
          <Form.Item name="teacher" label="授课老师" rules={[{ required: true, message: '请输入老师姓名' }]}>
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
          <Form.Item name="rating" label="课堂评分">
            <Rate />
          </Form.Item>
          <Form.Item name="content" label="反馈内容">
            <Input.TextArea rows={3} placeholder="请输入课堂反馈" />
          </Form.Item>
          <Form.Item name="suggestion" label="教学建议">
            <Input.TextArea rows={2} placeholder="对学员的建议" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
