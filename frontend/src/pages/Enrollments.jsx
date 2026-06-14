import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Tag, message, Alert, Descriptions, Steps, Result, Tabs, Timeline, Card, Row, Col, Statistic } from 'antd';
import { CheckCircleOutlined, WarningOutlined, FileTextOutlined, WalletOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const approvalStatusMap = {
  pending: { text: '待审批', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
};

const contractStatusMap = {
  pending: { text: '待签署', color: 'orange' },
  signed: { text: '已签署', color: 'green' },
  expired: { text: '已过期', color: 'default' },
  terminated: { text: '已终止', color: 'red' },
};

export default function Enrollments({ role }) {
  const [enrollments, setEnrollments] = useState([]);
  const [trials, setTrials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [refundRules, setRefundRules] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [stackResult, setStackResult] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [form] = Form.useForm();
  const canEnroll = role === 'admin';

  const load = async () => {
    const [eRes, tRes, cRes, cpRes, ctRes, rrRes, lsRes] = await Promise.all([
      axios.get('/api/enrollments'),
      axios.get('/api/trials'),
      axios.get('/api/courses'),
      axios.get('/api/coupons'),
      axios.get('/api/contracts'),
      axios.get('/api/refund-rules'),
      axios.get('/api/lead-sources'),
    ]);
    setEnrollments(eRes.data);
    setTrials(tRes.data);
    setCourses(cRes.data);
    setCoupons(cpRes.data);
    setContracts(ctRes.data);
    setRefundRules(rrRes.data);
    setLeadSources(lsRes.data);
  };

  useEffect(() => { load(); }, []);

  const visitedTrials = trials.filter(t => t.visited === 'yes');
  const activeCoupons = coupons.filter(c => c.status === 'active' && c.used === 'no');

  const getContractByEnrollment = (enrollmentId) => {
    return contracts.find(c => c.enrollment_id === enrollmentId);
  };

  const handleTrialChange = (value) => {
    const trial = trials.find(t => t.id === value);
    if (trial) {
      form.setFieldsValue({
        consultant: trial.consultant,
        lead_id: trial.lead_id,
      });
    }
  };

  const handleCouponChange = async (values) => {
    const couponIds = values || [];
    if (couponIds.length === 0) {
      setStackResult(null);
      return;
    }
    try {
      const res = await axios.post('/api/coupons/check-stack', {
        coupon_ids: couponIds,
      });
      setStackResult(res.data);
    } catch (e) {
      setStackResult({ valid: false, errors: ['优惠券校验失败'], total_discount: 0 });
    }
  };

  const handleCheck = async () => {
    try {
      const values = await form.validateFields(['trial_id', 'course_id']);
      const couponIds = form.getFieldValue('coupon_ids') || [];
      const trial = trials.find(t => t.id === values.trial_id);
      const res = await axios.post('/api/enrollments/check-enhanced', {
        trial_id: values.trial_id,
        lead_id: trial?.lead_id,
        student_name: trial?.student_name,
        course_id: values.course_id,
        coupon_ids: couponIds,
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
      const couponIds = values.coupon_ids || [];
      const couponList = couponIds.map(id => coupons.find(c => c.id === id)).filter(Boolean);

      const original_fee = course?.fee || 3000;
      const discount_amount = stackResult?.total_discount || 0;
      const final_fee = original_fee - discount_amount;

      const res = await axios.post('/api/enrollments/safe-create', {
        trial_id: values.trial_id,
        lead_id: trial?.lead_id,
        student_name: trial?.student_name,
        course_id: values.course_id,
        coupon_ids: couponIds,
        coupon_codes: couponList.map(c => c.code).join(','),
        discount_amount,
        original_fee,
        final_fee,
        operator: '教务张老师',
        consultant: values.consultant,
        sales_attribution: values.sales_attribution,
        campus_id: course?.campus_id,
        campus_name: course?.campus_name,
        package_id: course?.package_id,
        package_name: course?.package_name,
        refund_rule_id: values.refund_rule_id,
        trace_id: checkResult?.trace_id,
      });
      message.success(`报名成功！合同已生成，审计链路: ${res.data.trace_id}`);
      setModalOpen(false);
      setCheckResult(null);
      setStackResult(null);
      form.resetFields();
      load();
    } catch (e) {
      const errMsg = e.response?.data?.error || '报名失败';
      const traceId = e.response?.data?.trace_id;
      message.error(traceId ? `${errMsg} (链路: ${traceId})` : errMsg);
    }
  };

  const handleRowClick = async (record) => {
    try {
      const res = await axios.get(`/api/enrollments/${record.id}`);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (e) {
      message.error('获取详情失败');
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
    {
      title: '优惠券', dataIndex: 'coupon_codes', key: 'coupons',
      render: v => {
        if (!v) return '-';
        const codes = v.split(',');
        return codes.map((code, i) => <Tag key={i} color="blue">{code}</Tag>);
      },
    },
    {
      title: '合同状态', dataIndex: 'contract_id', key: 'contract',
      render: (_, record) => {
        const contract = getContractByEnrollment(record.id);
        if (!contract) return <Tag color="default">未生成</Tag>;
        const status = contractStatusMap[contract.status] || contractStatusMap.pending;
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '审批状态', dataIndex: 'approval_status', key: 'approval',
      render: v => {
        const status = approvalStatusMap[v] || approvalStatusMap.pending;
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    { title: '销售顾问', dataIndex: 'consultant', key: 'consultant', render: v => v || '-' },
    { title: '销售归因', dataIndex: 'sales_attribution', key: 'sales', render: v => v || '-' },
    { title: '经办人', dataIndex: 'operator', key: 'op' },
    { title: '报名时间', dataIndex: 'created_at', key: 'cat', render: v => dayjs(v).format('MM-DD HH:mm') },
  ];

  const renderDetailContent = () => {
    if (!detailData) return null;
    const { enrollment, contract, approvals } = detailData;

    const couponCodes = enrollment.coupon_codes ? enrollment.coupon_codes.split(',') : [];
    const refundRule = refundRules.find(r => r.id === enrollment.refund_rule_id);

    return (
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: '基本信息',
            children: (
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="学员">{enrollment.student_name}</Descriptions.Item>
                <Descriptions.Item label="课程">{enrollment.course_name}</Descriptions.Item>
                <Descriptions.Item label="原价">¥{enrollment.original_fee}</Descriptions.Item>
                <Descriptions.Item label="优惠金额">
                  <span style={{ color: '#f5222d' }}>-¥{enrollment.discount_amount}</span>
                </Descriptions.Item>
                <Descriptions.Item label="实付金额">
                  <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{enrollment.final_fee}</span>
                </Descriptions.Item>
                <Descriptions.Item label="审批状态">
                  {approvalStatusMap[enrollment.approval_status] && (
                    <Tag color={approvalStatusMap[enrollment.approval_status].color}>
                      {approvalStatusMap[enrollment.approval_status].text}
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="销售顾问">{enrollment.consultant || '-'}</Descriptions.Item>
                <Descriptions.Item label="销售归因">{enrollment.sales_attribution || '-'}</Descriptions.Item>
                <Descriptions.Item label="经办人">{enrollment.operator || '-'}</Descriptions.Item>
                <Descriptions.Item label="报名时间">
                  {dayjs(enrollment.created_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="使用优惠券" span={2}>
                  {couponCodes.length > 0
                    ? couponCodes.map((c, i) => <Tag key={i} color="blue">{c}</Tag>)
                    : '-'}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: '2',
            label: '合同信息',
            children: contract ? (
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="合同编号">
                  <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>
                    {contract.contract_no}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="合同状态">
                  {contractStatusMap[contract.status] && (
                    <Tag color={contractStatusMap[contract.status].color}>
                      {contractStatusMap[contract.status].text}
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="课程包">{contract.package_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="合同金额">¥{contract.original_amount}</Descriptions.Item>
                <Descriptions.Item label="优惠金额">
                  <span style={{ color: '#f5222d' }}>-¥{contract.discount_amount}</span>
                </Descriptions.Item>
                <Descriptions.Item label="成交金额">
                  <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{contract.final_amount}</span>
                </Descriptions.Item>
                <Descriptions.Item label="签署日期">{contract.sign_date || '-'}</Descriptions.Item>
                <Descriptions.Item label="生效日期">{contract.effective_date || '-'}</Descriptions.Item>
                <Descriptions.Item label="到期日期">{contract.expire_date || '-'}</Descriptions.Item>
                <Descriptions.Item label="签署人">{contract.signed_by || '-'}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Result status="info" title="暂无合同信息" subTitle="该报名记录尚未生成合同" />
            ),
          },
          {
            key: '3',
            label: '审批记录',
            children: approvals && approvals.length > 0 ? (
              <Timeline
                items={approvals.map(a => ({
                  color: a.approval_status === 'approved' ? 'green' : a.approval_status === 'rejected' ? 'red' : 'blue',
                  children: (
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {approvalStatusMap[a.approval_status]?.text || a.approval_status}
                      </div>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        审批人：{a.approver || '系统'} · {dayjs(a.approval_time || a.created_at).format('YYYY-MM-DD HH:mm')}
                      </div>
                      {a.approval_comment && (
                        <div style={{ marginTop: 4, color: '#333' }}>{a.approval_comment}</div>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Result status="info" title="暂无审批记录" subTitle="该报名记录暂无审批流程" />
            ),
          },
          {
            key: '4',
            label: '退费规则',
            children: refundRule ? (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="规则名称">{refundRule.name}</Descriptions.Item>
                <Descriptions.Item label="规则描述">{refundRule.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="开课前退费">
                  <Tag color="green">{(refundRule.before_start_refund_rate * 100).toFixed(0)}%</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="7天内退费">
                  <Tag color="blue">{(refundRule.within_7_days_rate * 100).toFixed(0)}%</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="30天内退费">
                  <Tag color="orange">{(refundRule.within_30_days_rate * 100).toFixed(0)}%</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="30天后退费">
                  <Tag color="red">{(refundRule.after_30_days_rate * 100).toFixed(0)}%</Tag>
                </Descriptions.Item>
                {refundRule.deduction_fee > 0 && (
                  <Descriptions.Item label="手续费">
                    <span style={{ color: '#f5222d' }}>¥{refundRule.deduction_fee}</span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Result status="info" title="暂无退费规则" subTitle="该报名记录未关联退费规则" />
            ),
          },
        ]}
      />
    );
  };

  return (
    <div>
      <Alert
        message="报名规则：试听未到访不能转正；课程满班只能进入候补；过期优惠券不能抵扣"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="报名人数"
              value={enrollments.length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已签合同"
              value={contracts.filter(c => c.status === 'signed').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="待审批"
              value={enrollments.filter(e => e.approval_status === 'pending').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="优惠总额"
              value={enrollments.reduce((sum, e) => sum + (e.discount_amount || 0), 0)}
              valueStyle={{ color: '#f5222d' }}
              prefix={<WalletOutlined />}
              precision={0}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: '#666' }}>共 {enrollments.length} 条报名记录</span>
        {canEnroll && (
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setModalOpen(true)}>
            办理报名
          </Button>
        )}
      </div>

      <Table
        dataSource={enrollments}
        rowKey="id"
        columns={columns}
        size="middle"
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title="办理报名"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setCheckResult(null); setStackResult(null); form.resetFields(); }}
        width={640}
        footer={checkResult && checkResult.can_enroll && !checkResult.is_waitlist
          ? [<Button key="cancel" onClick={() => { setModalOpen(false); setCheckResult(null); setStackResult(null); form.resetFields(); }}>取消</Button>, <Button key="ok" type="primary" onClick={handleEnroll}>确认报名</Button>]
          : [<Button key="cancel" onClick={() => { setModalOpen(false); setCheckResult(null); setStackResult(null); form.resetFields(); }}>关闭</Button>]
        }
      >
        <Steps current={checkResult ? 1 : 0} size="small" style={{ marginBottom: 20 }} items={[{ title: '填写信息' }, { title: '资格检查' }, { title: '确认报名' }]} />

        <Form form={form} layout="vertical">
          <Form.Item name="trial_id" label="试听记录" rules={[{ required: true, message: '请选择试听记录' }]}>
            <Select
              placeholder="选择已到访的试听学员"
              options={visitedTrials.map(t => ({ label: `${t.student_name} - ${t.course_name}`, value: t.id }))}
              onChange={handleTrialChange}
            />
          </Form.Item>
          <Form.Item name="course_id" label="报名课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select
              placeholder="选择报名课程"
              options={courses.map(c => ({
                label: `${c.name} (${c.enrolled}/${c.capacity}${c.status === 'full' ? ' 已满班' : ''}) - ¥${c.fee}`,
                value: c.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="coupon_ids" label="优惠券">
            <Select
              mode="multiple"
              placeholder="选择优惠券（可选，支持叠加）"
              allowClear
              options={activeCoupons.map(c => ({
                label: `${c.code} - ¥${c.amount} ${c.stackable ? '(可叠加)' : ''} (有效期至${c.expire_date})`,
                value: c.id,
              }))}
              onChange={handleCouponChange}
              maxTagCount="responsive"
            />
          </Form.Item>
          {stackResult && stackResult.errors && stackResult.errors.length > 0 && (
            <Alert
              type="error"
              showIcon
              message="优惠券叠加校验不通过"
              description={stackResult.errors.map((e, i) => <div key={i}>{e}</div>)}
              style={{ marginBottom: 16 }}
            />
          )}
          {stackResult && stackResult.valid && (
            <Alert
              type="success"
              showIcon
              message={`可叠加使用，共优惠 ¥${stackResult.total_discount}`}
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item name="consultant" label="销售顾问">
            <Select placeholder="选择销售顾问" allowClear options={[
              { label: '刘顾问', value: '刘顾问' },
              { label: '陈顾问', value: '陈顾问' },
              { label: '王顾问', value: '王顾问' },
            ]} />
          </Form.Item>
          <Form.Item name="sales_attribution" label="成交来源">
            <Select placeholder="选择成交来源" allowClear options={leadSources.map(s => ({ label: s.name, value: s.name }))} />
          </Form.Item>
          <Form.Item name="refund_rule_id" label="退费规则">
            <Select
              placeholder="选择退费规则"
              options={refundRules.map(r => ({ label: r.name, value: r.id }))}
              defaultValue="rr001"
            />
          </Form.Item>
          <Form.Item>
            <Button onClick={handleCheck} type="primary" ghost>
              检查报名资格
            </Button>
          </Form.Item>
        </Form>

        {checkResult && (
          <div style={{ marginTop: 16 }}>
            {checkResult.trace_id && (
              <Alert
                type="info"
                showIcon
                message={`审计链路: ${checkResult.trace_id}`}
                description="该编号可用于后续审计追踪"
                style={{ marginBottom: 12 }}
              />
            )}
            {checkResult.info && checkResult.info.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {checkResult.info.map((info, i) => (
                  <div key={i} style={{ color: '#52c41a', fontSize: 13, marginBottom: 4 }}>
                    {info}
                  </div>
                ))}
              </div>
            )}
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
                title={checkResult.is_waitlist ? '课程已满班，建议加入候补' : '有需要注意的事项'}
                subTitle={checkResult.warnings.map((w, i) => <div key={i}><WarningOutlined style={{ color: '#faad14' }} /> {w}</div>)}
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

      <Modal
        title="报名详情"
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailData(null); }}
        width={720}
        footer={[<Button key="close" onClick={() => { setDetailOpen(false); setDetailData(null); }}>关闭</Button>]}
      >
        {renderDetailContent()}
      </Modal>
    </div>
  );
}
