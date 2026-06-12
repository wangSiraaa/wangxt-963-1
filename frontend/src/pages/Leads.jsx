import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message } from 'antd';
import { PlusOutlined, PhoneOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const statusMap = { new: '新线索', trial_scheduled: '已排课', visited: '已到访', no_show: '未到访', enrolled: '已报名', waitlisted: '候补中' };
const colorMap = { new: 'blue', trial_scheduled: 'purple', visited: 'green', no_show: 'red', enrolled: 'orange', waitlisted: 'pink' };
const sourceOptions = ['线上推广', '转介绍', '地推活动', '老学员推荐', '自然到访', '其他'];

export default function Leads({ role }) {
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const canEdit = role === 'consultant' || role === 'admin';

  const load = async () => {
    const [lRes, cRes] = await Promise.all([axios.get('/api/leads'), axios.get('/api/courses')]);
    setLeads(lRes.data);
    setCourses(cRes.data);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      await axios.post('/api/leads', values);
      message.success('线索创建成功');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      if (e.response) message.error(e.response.data.error);
    }
  };

  const columns = [
    { title: '学员姓名', dataIndex: 'student_name', key: 'name' },
    { title: '家长姓名', dataIndex: 'parent_name', key: 'parent' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', render: v => <span><PhoneOutlined /> {v}</span> },
    { title: '年龄', dataIndex: 'age', key: 'age' },
    { title: '来源', dataIndex: 'source', key: 'source' },
    { title: '顾问', dataIndex: 'consultant', key: 'cons' },
    {
      title: '意向课程', dataIndex: 'course_id', key: 'course',
      render: v => {
        const c = courses.find(x => x.id === v);
        return c ? <Tag color="blue">{c.name}</Tag> : '-';
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: v => <Tag color={colorMap[v]}>{statusMap[v] || v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'cat', render: v => dayjs(v).format('MM-DD HH:mm') },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: '#666' }}>共 {leads.length} 条线索</span>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新增线索
          </Button>
        )}
      </div>

      <Table dataSource={leads} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />

      <Modal title="新增线索" open={modalOpen} onOk={handleAdd} onCancel={() => { setModalOpen(false); form.resetFields(); }} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="student_name" label="学员姓名" rules={[{ required: true, message: '请输入学员姓名' }]}>
            <Input placeholder="请输入学员姓名" />
          </Form.Item>
          <Form.Item name="parent_name" label="家长姓名">
            <Input placeholder="请输入家长姓名" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="age" label="年龄">
            <InputNumber min={3} max={18} placeholder="学员年龄" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="source" label="来源">
            <Select placeholder="选择来源" options={sourceOptions.map(s => ({ label: s, value: s }))} />
          </Form.Item>
          <Form.Item name="consultant" label="顾问">
            <Select placeholder="选择顾问" options={[{ label: '刘顾问', value: '刘顾问' }, { label: '陈顾问', value: '陈顾问' }]} />
          </Form.Item>
          <Form.Item name="course_id" label="意向课程">
            <Select placeholder="选择意向课程" allowClear options={courses.filter(c => c.status === 'active').map(c => ({ label: `${c.name} (${c.enrolled}/${c.capacity})`, value: c.id }))} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
