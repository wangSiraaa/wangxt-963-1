import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Tag, message, Descriptions, Alert, Space } from 'antd';
import { CalendarOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const visitTagMap = {
  pending: { text: '待确认', color: 'default' },
  visited: { text: '已到访', color: 'green' },
  no_show: { text: '未到访', color: 'red' },
};

export default function Trials({ role }) {
  const [trials, setTrials] = useState([]);
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const canSchedule = role === 'consultant' || role === 'admin';
  const canVisit = role === 'consultant' || role === 'admin';

  const load = async () => {
    const [tRes, lRes, cRes] = await Promise.all([
      axios.get('/api/trials'),
      axios.get('/api/leads'),
      axios.get('/api/courses'),
    ]);
    setTrials(tRes.data);
    setLeads(lRes.data);
    setCourses(cRes.data);
  };

  useEffect(() => { load(); }, []);

  const handleSchedule = async () => {
    try {
      const values = await form.validateFields();
      const lead = leads.find(l => l.id === values.lead_id);
      await axios.post('/api/trials', { ...values, student_name: lead?.student_name, consultant: lead?.consultant });
      message.success('试听安排成功');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      if (e.response) message.error(e.response.data.error);
    }
  };

  const handleVisit = async (id, visited) => {
    const visit_status = visited === 'yes' ? 'visited' : 'no_show';
    try {
      await axios.put(`/api/trials/${id}/visit`, { visited, visit_status });
      message.success(visited === 'yes' ? '已确认到访' : '已标记未到访');
      load();
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败');
    }
  };

  const scheduleLeads = leads.filter(l => l.status === 'new' || l.status === 'trial_scheduled');

  const columns = [
    { title: '学员', dataIndex: 'student_name', key: 'name' },
    { title: '课程', dataIndex: 'course_name', key: 'course' },
    { title: '试听日期', dataIndex: 'trial_date', key: 'date', render: v => <span><CalendarOutlined /> {v}</span> },
    { title: '顾问', dataIndex: 'consultant', key: 'cons' },
    {
      title: '到访状态', dataIndex: 'visit_status', key: 'visit',
      render: v => {
        const t = visitTagMap[v] || { text: v, color: 'default' };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    {
      title: '操作', key: 'action',
      render: (_, record) => {
        if (record.visited === 'yes') return <Tag color="green">已到访</Tag>;
        if (record.visit_status === 'no_show') return <Tag color="red">未到访</Tag>;
        return canVisit ? (
          <Space>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleVisit(record.id, 'yes')}>到访</Button>
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleVisit(record.id, 'no')}>未到访</Button>
          </Space>
        ) : null;
      },
    },
  ];

  return (
    <div>
      <Alert
        message="试听未到访的学员不能办理转正报名，请先确认到访状态"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: '#666' }}>共 {trials.length} 条试听记录</span>
        {canSchedule && (
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => setModalOpen(true)}>
            安排试听
          </Button>
        )}
      </div>

      <Table dataSource={trials} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />

      <Modal title="安排试听" open={modalOpen} onOk={handleSchedule} onCancel={() => { setModalOpen(false); form.resetFields(); }} okText="确认安排" cancelText="取消" width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="lead_id" label="选择线索" rules={[{ required: true, message: '请选择线索' }]}>
            <Select
              placeholder="选择待安排的线索"
              showSearch
              optionFilterProp="children"
              options={scheduleLeads.map(l => ({ label: `${l.student_name} - ${l.phone} (${l.source || '无来源'})`, value: l.id }))}
            />
          </Form.Item>
          <Form.Item name="course_id" label="试听课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select
              placeholder="选择试听课程"
              options={courses.map(c => ({
                label: `${c.name} - ${c.teacher} (${c.enrolled}/${c.capacity}${c.status === 'full' ? ' 已满' : ''})`,
                value: c.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="trial_date" label="试听日期" rules={[{ required: true, message: '请选择日期' }]}>
            <input type="date" style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }} onChange={e => form.setFieldValue('trial_date', e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
