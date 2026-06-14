const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

console.log('\n=== 退班触发候补自动转正 - 审计链路回归验证 ===\n');

let testPassed = 0;
let testFailed = 0;

function assert(condition, message) {
  if (condition) { testPassed++; console.log(`  ✅ ${message}`); }
  else { testFailed++; console.log(`  ❌ ${message}`); }
}

const serverCode = fs.readFileSync('./server.js', 'utf8');

console.log('--- 测试 1: addAuditLog 函数签名增强 (traceId + relatedObjectIds) ---');
{
  const m = serverCode.match(/function\s+addAuditLog\s*\(([^)]*)\)/);
  assert(m, '找到 addAuditLog 函数定义');
  const params = m ? m[1].split(',').map(p => p.trim().split('=')[0].trim()) : [];
  assert(params.includes('traceId'), '参数列表包含 traceId');
  assert(params.includes('relatedObjectIds'), '参数列表包含 relatedObjectIds');
  console.log(`  参数列表: [${params.join(', ')}]`);
}

console.log('\n--- 测试 2: 无 ORDER BY created_at DESC LIMIT 1 更新 audit_logs ---');
{
  const re = /UPDATE\s+audit_logs[\s\S]*?ORDER\s+BY\s+created_at\s+DESC\s+LIMIT\s+1/gi;
  const matches = serverCode.match(re);
  assert(!matches || matches.length === 0, `危险的时间戳更新语句数量应为 0 (实际 ${matches ? matches.length : 0})`);
  if (matches) matches.forEach((m, i) => console.log(`  ⚠️  第${i+1}处: ${m.split('\n')[0].slice(0, 120)}`));
}

console.log('\n--- 测试 3: 退班接口 trace_id 归集 (核心链路) ---');
{
  const routeStart = serverCode.indexOf('/api/class-drop-records');
  assert(routeStart > -1, '找到退班接口 /api/class-drop-records');

  const block = serverCode.slice(routeStart, routeStart + 9000);

  const traceGenCount = (block.match(/generateTraceId\s*\(\s*\)/g) || []).length;
  assert(traceGenCount === 1, `退班接口只生成 1 次 traceId (实际 ${traceGenCount})`);

  const auditCalls = block.match(/addAuditLog\s*\(/g) || [];
  assert(auditCalls.length >= 5, `至少写入 5 条审计日志 (drop/create_drop_record/release_seat/各waitlist转正), 实际 ${auditCalls.length}`);

  const loopExists = block.includes('for (const w of waitlists)') || block.includes('for (const waitlist');
  assert(loopExists, '退班接口包含候补自动转正循环');

  const hasDrop = /addAuditLog\s*\(\s*['"]drop['"]\s*,\s*['"]enrollment['"]/s.test(block);
  const hasCreateDrop = /addAuditLog\s*\(\s*['"]create['"]\s*,\s*['"]class_drop_record['"]/s.test(block);
  const hasReleaseSeat = /addAuditLog\s*\(\s*['"]release_seat['"]\s*,\s*['"]course['"]/s.test(block);
  const hasAutoConvert = /addAuditLog\s*\(\s*['"]auto_convert['"]\s*,\s*['"]waitlist['"]/s.test(block);
  const hasCreateContract = /addAuditLog\s*\(\s*['"]create['"]\s*,\s*['"]contract['"]/s.test(block);
  const hasSalesAttribution = /addAuditLog\s*\(\s*['"]update['"]\s*,\s*['"]sales_attribution['"]/s.test(block);
  const hasCreateEnrollment = /addAuditLog\s*\(\s*['"]create['"]\s*,\s*['"]enrollment['"]/s.test(block);

  assert(hasDrop, '包含 drop(enrollment) 审计动作');
  assert(hasCreateDrop, '包含 create(class_drop_record) 审计动作');
  assert(hasReleaseSeat, '包含 release_seat(course) 审计动作');
  assert(hasAutoConvert, '包含 auto_convert(waitlist) 审计动作');
  assert(hasCreateEnrollment, '包含 create(enrollment) 审计动作');
  assert(hasCreateContract, '包含 create(contract) 审计动作');
  assert(hasSalesAttribution, '包含 update(sales_attribution) 审计动作');
}

console.log('\n--- 测试 4: 候补安全转正接口 trace_id 归集 ---');
{
  const safeConvertIdx = serverCode.indexOf('/waitlists/safe-convert');
  assert(safeConvertIdx > -1, '找到候补安全转正接口');
  const block = serverCode.slice(safeConvertIdx, safeConvertIdx + 6000);
  const auditCalls = block.match(/addAuditLog\s*\(/g) || [];
  assert(auditCalls.length >= 3, `至少写入 3 条审计日志 (safe_convert/create_enrollment/create_contract), 实际 ${auditCalls.length}`);
  const hasSafeConvert = /addAuditLog\s*\(\s*['"]safe_convert['"]\s*,\s*['"]waitlist['"]/s.test(block);
  assert(hasSafeConvert, '包含 safe_convert(waitlist) 审计动作');
  const hasCreateEnrollment = /addAuditLog\s*\(\s*['"]create['"]\s*,\s*['"]enrollment['"]/s.test(block);
  assert(hasCreateEnrollment, '包含 create(enrollment) 审计动作');
  const hasCreateContract = /addAuditLog\s*\(\s*['"]create['"]\s*,\s*['"]contract['"]/s.test(block);
  assert(hasCreateContract, '包含 create(contract) 审计动作');
}

console.log('\n--- 测试 5: 审计链路查询 API 增强 ---');
{
  const idx = serverCode.indexOf('/audit-trail/trace/');
  assert(idx > -1, '找到审计链路查询接口 /audit-trail/trace/:trace_id');
  const block = serverCode.slice(idx, idx + 8000);
  const fields = ['total_events', 'operator_details', 'action_types', 'time_range',
    'related_object_ids', 'summary', 'event_flow',
    'buildAuditEventDescription', 'sequence:', 'description:'];
  fields.forEach(f => assert(block.includes(f), `返回数据结构包含 ${f}`));
}

console.log('\n--- 测试 6: buildAuditEventDescription 辅助函数定义 ---');
assert(serverCode.includes('function buildAuditEventDescription'), '定义了 buildAuditEventDescription 辅助函数');

console.log('\n--- 测试 7: 各接口无危险 UPDATE + 直接传入 trace 参数 ---');
{
  const endpoints = [
    { name: '跟进记录 POST', pattern: '/api/follow-up-records' },
    { name: '转介绍 POST', pattern: '/api/referrals' },
    { name: '意向变更 POST', pattern: '/api/intention-changes' },
    { name: '课程意向 POST', pattern: '/api/course-intentions' },
    { name: '欠费记录 POST', pattern: '/api/fee-arrears' },
    { name: '试听改约 POST', pattern: '/trials/:id/reschedule' },
    { name: '安全报名 POST', pattern: '/enrollments/safe-create' },
    { name: '候补安全转正 POST', pattern: '/waitlists/safe-convert' },
    { name: '老师请假影响 GET', pattern: '/teacher-leaves/:id/impact' },
    { name: '候补增强加入 POST', pattern: '/waitlists/enhanced' }
  ];

  endpoints.forEach(ep => {
    const idx = serverCode.indexOf(ep.pattern);
    assert(idx > -1, `找到接口: ${ep.name} (${ep.pattern})`);
    if (idx > -1) {
      const block = serverCode.slice(idx, idx + 3500);
      const hasDanger = /UPDATE\s+audit_logs[\s\S]*?ORDER\s+BY\s+created_at\s+DESC\s+LIMIT\s+1/i.test(block);
      assert(!hasDanger, `${ep.name} 无危险的时间戳 UPDATE`);
      const hasTraceArg = /addAuditLog[\s\S]*?(traceId|trace)\s*,[\s\S]*?\)/s.test(block) ||
                         block.includes(', trace,') || block.includes(', traceId,') ||
                         block.includes(', trace ]') || block.includes(', traceId ]');
      assert(hasTraceArg, `${ep.name} 直接传入 trace 参数到 addAuditLog`);
    }
  });
}

console.log('\n--- 测试 8: 退班链路所有审计日志共享同一个 traceId 变量 ---');
{
  const routeStart = serverCode.indexOf('/api/class-drop-records');
  const block = serverCode.slice(routeStart, routeStart + 9000);
  const constTraceCount = (block.match(/\bconst\s+traceId\b/g) || []).length;
  const letTraceCount = (block.match(/\blet\s+traceId\b/g) || []).length;
  assert(constTraceCount === 1 && letTraceCount === 0,
    `整个退班接口只定义 1 个 traceId 变量 (const=${constTraceCount}, let=${letTraceCount})`);
}

console.log('\n=== 测试结果汇总 ===');
console.log(`  通过: ${testPassed}`);
console.log(`  失败: ${testFailed}`);
console.log(`  总计: ${testPassed + testFailed}`);
console.log(`  通过率: ${testPassed + testFailed > 0 ? ((testPassed / (testPassed + testFailed)) * 100).toFixed(1) : 0}%`);

if (testFailed > 0) {
  console.log('\n⚠️  有测试失败，请检查');
  process.exit(1);
} else {
  console.log('\n🎉 所有回归测试通过！');
  process.exit(0);
}
