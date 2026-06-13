import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message, Tabs, Descriptions, List, Timeline } from 'antd';
import { PlusOutlined, PhoneOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const statusMap = { new: '新线索', trial_scheduled: '已排课', visited: '已到访', no_show: '未到访', enrolled: '已报名', waitlisted: '候补中' };
const colorMap = { new: 'blue', trial_scheduled: 'purple', visited: 'green', no_show: 'red', enrolled: 'orange', waitlisted: 'pink' };

export default function Leads({ role }) {
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [campusFilter, setCampusFilter] = useState([]);
  const [form] = Form.useForm();
  const canEdit = role === 'consultant' || role === 'admin';

  const load = async () => {
    const [lRes, cRes, campRes, srcRes] = await Promise.all([
      axios.get('/api/leads'),
      axios.get('/api/courses'),
      axios.get('/api/campuses'),
      axios.get('/api/lead-sources')
    ]);
    setLeads(lRes.data);
    setCourses(cRes.data);
    setCampuses(campRes.data);
    setLeadSources(srcRes.data);
  };

  useEffect(() => { load(); }, []);

  const filteredLeads = campusFilter.length > 0
    ? leads.filter(lead => campusFilter.includes(lead.campus_id))
    : leads;

  const getCampusName = (campusId) => {
    const campus = campuses.find(c => c.id === campusId);
    return campus ? campus.name : '-';
  };

  const getSourceName = (sourceId) => {
    const source = leadSources.find(s => s.id === sourceId);
    return source ? source.name : sourceId || '-';
  };

  const loadLeadDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/leads/${id}`);
      setCurrentLead(res.data);
      setDetailModalOpen(true);
    } catch (e) {
      if (e.response) message.error(e.response.data.error);
    } finally {
      setDetailLoading(false);
    }
  };

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
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => loadLeadDetail(record.id)}>
          详情
        </Button>
      ),
    },
    { title: '学员姓名', dataIndex: 'student_name', key: 'name' },
    { title: '家长姓名', dataIndex: 'parent_name', key: 'parent' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', render: v => <span><PhoneOutlined /> {v}</span> },
    { title: '年龄', dataIndex: 'age', key: 'age' },
    {
      title: '校区', dataIndex: 'campus_id', key: 'campus',
      render: v => getCampusName(v),
    },
    {
      title: '来源', dataIndex: 'source_id', key: 'source',
      render: v => getSourceName(v),
    },
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ fontSize: 14, color: '#666' }}>共 {filteredLeads.length} 条线索</span>
          <Select
            mode="multiple"
            placeholder="校区筛选"
            style={{ minWidth: 200 }}
            value={campusFilter}
            onChange={setCampusFilter}
            options={campuses.map(c => ({ label: c.name, value: c.id }))}
            allowClear
          />
        </Space>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新增线索
          </Button>
        )}
      </div>

      <Table dataSource={filteredLeads} rowKey="id" columns={columns} size="middle" pagination={{ pageSize: 10 }} />

      <Modal title="新增线索" open={modalOpen} onOk={handleAdd} onCancel={() => { setModalOpen(false); form.resetFields(); }} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="campus_id" label="校区" rules={[{ required: true, message: '请选择校区' }]}>
            <Select placeholder="选择校区" options={campuses.map(c => ({ label: c.name, value: c.id }))} />
          </Form.Item>
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
          <Form.Item name="source_id" label="来源">
            <Select placeholder="选择来源" allowClear options={leadSources.map(s => ({ label: s.name, value: s.id }))} />
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

      <Modal
        title="线索详情"
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setCurrentLead(null); }}
        footer={null}
        width={800}
        destroyOnClose
      >
        {currentLead && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="学员姓名">{currentLead.student_name}</Descriptions.Item>
                    <Descriptions.Item label="家长姓名">{currentLead.parent_name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="联系电话">{currentLead.phone}</Descriptions.Item>
                    <Descriptions.Item label="年龄">{currentLead.age || '-'}</Descriptions.Item>
                    <Descriptions.Item label="校区">{getCampusName(currentLead.campus_id)}</Descriptions.Item>
                    <Descriptions.Item label="来源">{getSourceName(currentLead.source_id)}</Descriptions.Item>
                    <Descriptions.Item label="顾问">{currentLead.consultant || '-'}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={colorMap[currentLead.status]}>{statusMap[currentLead.status] || currentLead.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="意向课程">
                      {(() => {
                        const c = courses.find(x => x.id === currentLead.course_id);
                        return c ? c.name : '-';
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {dayjs(currentLead.created_at).format('YYYY-MM-DD HH:mm')}
                    </Descriptions.Item>
                    <Descriptions.Item label="备注" span={2}>{currentLead.remark || '-'}</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'contacts',
                label: `家长联系人 (${currentLead.parent_contacts?.length || 0})`,
                children: (
                  <List
                    dataSource={currentLead.parent_contacts || []}
                    locale={{ emptyText: '暂无家长联系人' }}
                    renderItem={item => (
                      <List.Item key={item.id}>
                        <List.Item.Meta
                          title={item.name || '未命名联系人'}
                          description={
                            <Space direction="vertical" size={0}>
                              {item.phone && <span><PhoneOutlined /> {item.phone}</span>}
                              {item.relation && <span>关系：{item.relation}</span>}
                              {item.remark && <span>备注：{item.remark}</span>}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
              {
                key: 'followups',
                label: `跟进计划 (${currentLead.follow_up_plans?.length || 0})`,
                children: (
                  <Timeline
                    items={(currentLead.follow_up_plans || []).map(item => ({
                      color: item.status === 'completed' ? 'green' : item.status === 'cancelled' ? 'red' : 'blue',
                      children: (
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {item.title || item.content || '未命名跟进'}
                            <Tag style={{ marginLeft: 8 }} color={item.status === 'completed' ? 'green' : item.status === 'cancelled' ? 'red' : 'blue'}>
                              {item.status === 'completed' ? '已完成' : item.status === 'cancelled' ? '已取消' : '待跟进'}
                            </Tag>
                          </div>
                          <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                            计划时间：{item.plan_time ? dayjs(item.plan_time).format('YYYY-MM-DD HH:mm') : '-'}
                          </div>
                          {item.content && <div style={{ marginTop: 8 }}>{item.content}</div>}
                          {item.remark && <div style={{ color: '#999', marginTop: 4 }}>备注：{item.remark}</div>}
                        </div>
                      ),
                    }))}
                    pending={currentLead.follow_up_plans?.length === 0 ? '暂无跟进计划' : null}
                  />
                ),
              },
              {
                key: 'versions',
                label: `版本历史 (${currentLead.lead_versions?.length || 0})`,
                children: (
                  <Timeline
                    items={(currentLead.lead_versions || []).map(item => ({
                      children: (
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {item.action || '修改'}
                            <span style={{ color: '#999', fontWeight: 'normal', marginLeft: 8, fontSize: 12 }}>
                              {item.operator || '系统'} · {item.created_at ? dayjs(item.created_at).format('MM-DD HH:mm') : ''}
                            </span>
                          </div>
                          {item.change_summary && <div style={{ marginTop: 4, color: '#666' }}>{item.change_summary}</div>}
                          {item.remark && <div style={{ marginTop: 4, color: '#999' }}>备注：{item.remark}</div>}
                        </div>
                      ),
                    }))}
                    pending={currentLead.lead_versions?.length === 0 ? '暂无版本历史' : null}
                  />
                ),
              },
              {
                key: 'trials',
                label: `试听记录 (${currentLead.trials?.length || 0})`,
                children: (
                  <List
                    dataSource={currentLead.trials || []}
                    locale={{ emptyText: '暂无试听记录' }}
                    renderItem={item => (
                      <List.Item key={item.id}>
                        <List.Item.Meta
                          title={
                            <Space>
                              <span>{item.course_name || '试听课程'}</span>
                              <Tag color={item.status === 'attended' ? 'green' : item.status === 'no_show' ? 'red' : 'blue'}>
                                {item.status === 'attended' ? '已到场' : item.status === 'no_show' ? '未到场' : '已排课'}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={0}>
                              {item.trial_time && <span>试听时间：{dayjs(item.trial_time).format('YYYY-MM-DD HH:mm')}</span>}
                              {item.teacher && <span>授课老师：{item.teacher}</span>}
                              {item.classroom && <span>教室：{item.classroom}</span>}
                              {item.feedback && <span>反馈：{item.feedback}</span>}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
