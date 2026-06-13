import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Tag, message, Alert, Space, Input } from 'antd';
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
  const [teachers, setTeachers] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [visitType, setVisitType] = useState(null);
  const [form] = Form.useForm();
  const [visitForm] = Form.useForm();
  const [campusFilter, setCampusFilter] = useState();
  const [teacherFilter, setTeacherFilter] = useState();
  const [currentTeacherId, setCurrentTeacherId] = useState(null);
  const canSchedule = role === 'consultant' || role === 'admin';
  const canVisit = role === 'consultant' || role === 'admin';

  const load = async () => {
    const params = {};
    if (campusFilter) params.campus_id = campusFilter;
    
    if (role === 'teacher' && currentTeacherId) {
      params.teacher_id = currentTeacherId;
    } else if (teacherFilter) {
      params.teacher_id = teacherFilter;
    }

    const [tRes, lRes, cRes, teaRes, camRes] = await Promise.all([
      axios.get('/api/trials', { params }),
      axios.get('/api/leads'),
      axios.get('/api/courses'),
      axios.get('/api/teachers'),
      axios.get('/api/campuses'),
    ]);

    setTrials(tRes.data);
    setLeads(lRes.data);
    setCourses(cRes.data);
    setTeachers(teaRes.data);
    setCampuses(camRes.data);

    if (role === 'teacher' && teaRes.data.length > 0 && !currentTeacherId) {
      setCurrentTeacherId(teaRes.data[0].id);
    }
  };

  useEffect(() => {
    if (role === 'teacher' && teachers.length > 0) {
      setCurrentTeacherId(teachers[0].id);
    }
  }, [role, teachers]);

  useEffect(() => { load(); }, [campusFilter, teacherFilter, currentTeacherId, role]);

  const handleSchedule = async () => {
    try {
      const values = await form.validateFields();
      const lead = leads.find(l => l.id === values.lead_id);

      const checkRes = await axios.post('/api/trials/check', {
        lead_id: values.lead_id,
        course_id: values.course_id,
        teacher_id: values.teacher_id,
        trial_date: values.trial_date,
      });

      if (!checkRes.data.can_schedule) {
        message.error(checkRes.data.errors.join('；'));
        return;
      }

      const teacher = teachers.find(t => t.id === values.teacher_id);
      const course = courses.find(c => c.id === values.course_id);
      await axios.post('/api/trials', { 
        ...values, 
        student_name: lead?.student_name, 
        consultant: lead?.consultant,
        teacher_name: teacher?.name,
        campus_id: course?.campus_id,
        campus_name: course?.campus_name,
      });
      message.success('试听安排成功');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      if (e.response) message.error(e.response.data.error);
    }
  };

  const openVisitModal = (record, type) => {
    setCurrentTrial(record);
    setVisitType(type);
    visitForm.setFieldsValue({
      visit_time: dayjs().format('YYYY-MM-DD HH:mm'),
      remark: '',
    });
    setVisitModalOpen(true);
  };

  const handleVisit = async () => {
    try {
      const values = await visitForm.validateFields();
      const visit_status = visitType === 'yes' ? 'visited' : 'no_show';
      await axios.put(`/api/trials/${currentTrial.id}/visit`, { 
        visited: visitType, 
        visit_status,
        visit_time: values.visit_time,
        remark: values.remark,
      });
      message.success(visitType === 'yes' ? '已确认到访' : '已标记未到访');
      setVisitModalOpen(false);
      visitForm.resetFields();
      load();
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败');
    }
  };

  const scheduleLeads = leads.filter(l => l.status === 'new' || l.status === 'trial_scheduled');

  const getTeacherInfo = (teacherId) => {
    return teachers.find(t => t.id === teacherId) || null;
  };

  const getCampusName = (campusId) => {
    const campus = campuses.find(c => c.id === campusId);
    return campus?.name || campusId || '-';
  };

  const columns = [
    { title: '学员', dataIndex: 'student_name', key: 'name' },
    { title: '课程', dataIndex: 'course_name', key: 'course' },
    { 
      title: '老师', 
      dataIndex: 'teacher_name', 
      key: 'teacher',
      render: (text, record) => {
        const teacher = getTeacherInfo(record.teacher_id);
        return (
          <span>
            {text || '-'}
            {teacher && teacher.subject && <Tag color="blue" style={{ marginLeft: 8 }}>{teacher.subject}</Tag>}
          </span>
        );
      }
    },
    { 
      title: '校区', 
      dataIndex: 'campus_name', 
      key: 'campus',
      render: (text, record) => getCampusName(record.campus_id) || text || '-',
    },
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
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openVisitModal(record, 'yes')}>到访</Button>
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => openVisitModal(record, 'no')}>未到访</Button>
          </Space>
        ) : null;
      },
    },
  ];

  const showFilters = role !== 'teacher';

  return (
    <div>
      <Alert
        message="试听未到访的学员不能办理转正报名，请先确认到访状态"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: '#666' }}>共 {trials.length} 条试听记录</span>
        <Space>
          {showFilters && (
            <>
              <Select
                placeholder="校区筛选"
                allowClear
                style={{ width: 140 }}
                value={campusFilter}
                onChange={setCampusFilter}
                options={campuses.map(c => ({ label: c.name, value: c.id }))}
              />
              <Select
                placeholder="老师筛选"
                allowClear
                style={{ width: 140 }}
                value={teacherFilter}
                onChange={setTeacherFilter}
                options={teachers.map(t => ({ label: t.name, value: t.id }))}
              />
            </>
          )}
          {canSchedule && (
            <Button type="primary" icon={<CalendarOutlined />} onClick={() => setModalOpen(true)}>
              安排试听
            </Button>
          )}
        </Space>
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
                label: `${c.name} - ${c.teacher_name} (${c.enrolled}/${c.capacity}${c.status === 'full' ? ' 已满' : ''})`,
                value: c.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="teacher_id" label="选择老师" rules={[{ required: true, message: '请选择老师' }]}>
            <Select
              placeholder="选择授课老师"
              showSearch
              optionFilterProp="children"
              options={teachers.map(t => ({ 
                label: `${t.name} - ${t.subject || '未设置学科'}`, 
                value: t.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="trial_date" label="试听日期" rules={[{ required: true, message: '请选择日期' }]}>
            <input type="date" style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }} onChange={e => form.setFieldValue('trial_date', e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title={visitType === 'yes' ? '确认到访' : '标记未到访'} 
        open={visitModalOpen} 
        onOk={handleVisit} 
        onCancel={() => { setVisitModalOpen(false); visitForm.resetFields(); }} 
        okText="确认" 
        cancelText="取消" 
        width={480}
      >
        <Form form={visitForm} layout="vertical">
          <Form.Item name="visit_time" label="到访时间" rules={[{ required: true, message: '请输入到访时间' }]}>
            <Input placeholder="请输入到访时间" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注信息" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
