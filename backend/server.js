const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'data', 'trial.db');
let db = null;

async function initDb() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    console.log('📂 数据库已加载');
  } else {
    db = new SQL.Database();
    console.log('📂 新数据库已创建');
  }

  createTables();
  seedData();
  persist();
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS campuses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS course_packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      total_hours INTEGER,
      original_price REAL,
      discount_price REAL,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT,
      phone TEXT,
      campus_id TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teacher_schedules (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      campus_id TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teacher_leaves (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      leave_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      teacher_id TEXT,
      teacher_name TEXT,
      capacity INTEGER NOT NULL,
      enrolled INTEGER DEFAULT 0,
      schedule TEXT,
      schedule_day TEXT,
      schedule_time TEXT,
      campus_id TEXT,
      campus_name TEXT,
      package_id TEXT,
      package_name TEXT,
      priority INTEGER DEFAULT 0,
      fee REAL DEFAULT 3000,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lead_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS parent_contacts (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      relation TEXT,
      name TEXT,
      phone TEXT,
      wechat TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lead_versions (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      student_name TEXT,
      parent_name TEXT,
      phone TEXT,
      age INTEGER,
      source TEXT,
      consultant TEXT,
      status TEXT,
      course_id TEXT,
      remark TEXT,
      changed_by TEXT,
      change_reason TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      student_name TEXT NOT NULL,
      parent_name TEXT,
      phone TEXT NOT NULL,
      age INTEGER,
      source TEXT,
      source_id TEXT,
      consultant TEXT,
      campus_id TEXT,
      campus_name TEXT,
      status TEXT DEFAULT 'new',
      course_id TEXT,
      course_name TEXT,
      remark TEXT,
      version INTEGER DEFAULT 1,
      sales_attribution TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS follow_up_plans (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      plan_date TEXT NOT NULL,
      plan_content TEXT,
      follow_up_by TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      actual_date TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS visit_records (
      id TEXT PRIMARY KEY,
      trial_id TEXT NOT NULL,
      lead_id TEXT,
      student_name TEXT,
      visit_time TEXT,
      visitor TEXT,
      accompany_person TEXT,
      visit_status TEXT,
      remark TEXT,
      recorded_by TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trials (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_name TEXT,
      teacher_id TEXT,
      teacher_name TEXT,
      trial_date TEXT NOT NULL,
      trial_time TEXT,
      campus_id TEXT,
      campus_name TEXT,
      visited TEXT DEFAULT 'no',
      visit_status TEXT DEFAULT 'pending',
      feedback_status TEXT DEFAULT 'pending',
      consultant TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      trial_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      course_name TEXT,
      teacher_id TEXT,
      teacher TEXT NOT NULL,
      rating INTEGER,
      attention_rating INTEGER,
      interaction_rating INTEGER,
      understanding_rating INTEGER,
      content TEXT,
      suggestion TEXT,
      strengths TEXT,
      weaknesses TEXT,
      recommend_level TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coupon_stacks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_stack_count INTEGER DEFAULT 1,
      stackable_types TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT,
      amount REAL NOT NULL,
      type TEXT DEFAULT 'fixed',
      min_amount REAL DEFAULT 0,
      student_name TEXT,
      expire_date TEXT NOT NULL,
      used TEXT DEFAULT 'no',
      status TEXT DEFAULT 'active',
      stackable INTEGER DEFAULT 0,
      stack_group TEXT,
      course_ids TEXT,
      source TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refund_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      before_start_refund_rate REAL DEFAULT 1,
      within_7_days_rate REAL DEFAULT 0.8,
      within_30_days_rate REAL DEFAULT 0.5,
      after_30_days_rate REAL DEFAULT 0,
      deduction_fee REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      contract_no TEXT NOT NULL,
      enrollment_id TEXT,
      student_name TEXT,
      course_id TEXT,
      course_name TEXT,
      package_id TEXT,
      package_name TEXT,
      original_amount REAL,
      discount_amount REAL,
      final_amount REAL,
      status TEXT DEFAULT 'pending',
      sign_date TEXT,
      effective_date TEXT,
      expire_date TEXT,
      signed_by TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS enrollment_approvals (
      id TEXT PRIMARY KEY,
      enrollment_id TEXT NOT NULL,
      approver TEXT,
      approval_status TEXT DEFAULT 'pending',
      approval_comment TEXT,
      approval_time TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      trial_id TEXT,
      lead_id TEXT,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_name TEXT,
      campus_id TEXT,
      campus_name TEXT,
      package_id TEXT,
      package_name TEXT,
      coupon_id TEXT,
      coupon_code TEXT,
      discount_amount REAL DEFAULT 0,
      coupon_ids TEXT,
      coupon_codes TEXT,
      original_fee REAL,
      final_fee REAL,
      operator TEXT,
      consultant TEXT,
      sales_attribution TEXT,
      status TEXT DEFAULT 'enrolled',
      approval_status TEXT DEFAULT 'approved',
      contract_id TEXT,
      refund_rule_id TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS waitlists (
      id TEXT PRIMARY KEY,
      trial_id TEXT,
      lead_id TEXT,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_name TEXT,
      campus_id TEXT,
      campus_name TEXT,
      coupon_id TEXT,
      coupon_code TEXT,
      discount_amount REAL DEFAULT 0,
      course_priority INTEGER DEFAULT 0,
      enroll_time TEXT,
      coupon_expire_date TEXT,
      operator TEXT,
      consultant TEXT,
      status TEXT DEFAULT 'waiting',
      position INTEGER,
      sort_score REAL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      module TEXT,
      object_id TEXT,
      object_name TEXT,
      operator TEXT,
      role TEXT,
      old_value TEXT,
      new_value TEXT,
      ip TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rule_explanations (
      id TEXT PRIMARY KEY,
      rule_code TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      condition TEXT,
      result TEXT,
      example TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  console.log('📋 数据库表创建完成');
}

function persist() {
  const data = db.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buf);
}

function queryAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result[0]) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function addAuditLog(action, module, objectId, objectName, operator, role, oldValue, newValue) {
  const id = 'a' + uuidv4().slice(0, 8);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  db.run(`INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id, action, module, objectId, objectName || '', operator || 'system', role || '', 
    oldValue ? JSON.stringify(oldValue) : '',
    newValue ? JSON.stringify(newValue) : '',
    now
  ]);
}

function createLeadVersion(leadId, changedBy, changeReason) {
  const lead = queryOne(`SELECT * FROM leads WHERE id = ?`, [leadId]);
  if (!lead) return;
  
  const versionId = 'v' + uuidv4().slice(0, 8);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const newVersion = (lead.version || 1) + 1;
  
  db.run(`INSERT INTO lead_versions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    versionId, leadId, lead.version,
    lead.student_name, lead.parent_name, lead.phone, lead.age,
    lead.source, lead.consultant, lead.status, lead.course_id,
    lead.remark, changedBy || 'system', changeReason || '',
    now
  ]);
  
  db.run(`UPDATE leads SET version = ? WHERE id = ?`, [newVersion, leadId]);
}

function calculateWaitlistSortScore(waitlist) {
  let score = 0;
  
  if (waitlist.enroll_time) {
    const enrollDate = dayjs(waitlist.enroll_time);
    const daysAgo = dayjs().diff(enrollDate, 'day');
    score += Math.max(0, 30 - daysAgo) * 2;
  }
  
  score += (waitlist.course_priority || 0) * 10;
  
  if (waitlist.coupon_expire_date) {
    const expireDate = dayjs(waitlist.coupon_expire_date);
    const daysToExpire = expireDate.diff(dayjs(), 'day');
    if (daysToExpire < 7) {
      score += 20;
    } else if (daysToExpire < 14) {
      score += 10;
    }
  }
  
  return score;
}

function updateWaitlistPositions(courseId) {
  const waitlists = queryAll(
    `SELECT * FROM waitlists WHERE course_id = ? AND status = 'waiting' ORDER BY sort_score DESC, created_at ASC`,
    [courseId]
  );
  
  waitlists.forEach((w, index) => {
    const newPosition = index + 1;
    const newScore = calculateWaitlistSortScore(w);
    db.run(`UPDATE waitlists SET position = ?, sort_score = ? WHERE id = ?`, [
      newPosition, newScore, w.id
    ]);
  });
}

function seedData() {
  const count = db.exec("SELECT COUNT(*) as cnt FROM campuses");
  if (count[0] && count[0].values[0][0] > 0) {
    console.log('已有初始数据，跳过种子数据');
    return;
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const futureDate = dayjs().add(30, 'day').format('YYYY-MM-DD');
  const pastDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const dayAfterTomorrow = dayjs().add(2, 'day').format('YYYY-MM-DD');
  const threeDaysLater = dayjs().add(3, 'day').format('YYYY-MM-DD');

  const campuses = [
    { id: 'camp001', name: '朝阳校区', address: '北京市朝阳区建国路88号', phone: '010-88881111' },
    { id: 'camp002', name: '海淀校区', address: '北京市海淀区中关村大街1号', phone: '010-88882222' },
  ];
  campuses.forEach(c => {
    db.run(`INSERT INTO campuses VALUES (?, ?, ?, ?, 'active', ?)`, [c.id, c.name, c.address, c.phone, now]);
  });

  const coursePackages = [
    { id: 'pkg001', name: '启蒙套餐', description: '48课时启蒙课程', total_hours: 48, original_price: 9600, discount_price: 8800 },
    { id: 'pkg002', name: '进阶套餐', description: '96课时进阶课程', total_hours: 96, original_price: 18000, discount_price: 16000 },
    { id: 'pkg003', name: '精英套餐', description: '144课时精英课程', total_hours: 144, original_price: 28800, discount_price: 25000 },
  ];
  coursePackages.forEach(p => {
    db.run(`INSERT INTO course_packages VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`, [p.id, p.name, p.description, p.total_hours, p.original_price, p.discount_price, now]);
  });

  const teachers = [
    { id: 't001', name: '王老师', subject: '英语', phone: '13900000001', campus_id: 'camp001' },
    { id: 't002', name: '李老师', subject: '数学', phone: '13900000002', campus_id: 'camp001' },
    { id: 't003', name: '张老师', subject: '美术', phone: '13900000003', campus_id: 'camp002' },
    { id: 't004', name: '陈老师', subject: '编程', phone: '13900000004', campus_id: 'camp002' },
    { id: 't005', name: '赵老师', subject: '钢琴', phone: '13900000005', campus_id: 'camp001' },
  ];
  teachers.forEach(t => {
    db.run(`INSERT INTO teachers VALUES (?, ?, ?, ?, ?, 'active', ?)`, [t.id, t.name, t.subject, t.phone, t.campus_id, now]);
  });

  const teacherSchedules = [
    { id: 'ts001', teacher_id: 't001', day_of_week: 6, start_time: '09:00', end_time: '10:30', campus_id: 'camp001' },
    { id: 'ts002', teacher_id: 't002', day_of_week: 0, start_time: '14:00', end_time: '15:30', campus_id: 'camp001' },
    { id: 'ts003', teacher_id: 't003', day_of_week: 6, start_time: '14:00', end_time: '16:00', campus_id: 'camp002' },
    { id: 'ts004', teacher_id: 't004', day_of_week: 0, start_time: '09:00', end_time: '10:30', campus_id: 'camp002' },
  ];
  teacherSchedules.forEach(s => {
    db.run(`INSERT INTO teacher_schedules VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`, [s.id, s.teacher_id, s.day_of_week, s.start_time, s.end_time, s.campus_id, now]);
  });

  const teacherLeaves = [
    { id: 'tl001', teacher_id: 't005', leave_date: dayjs().add(5, 'day').format('YYYY-MM-DD'), reason: '年假' },
  ];
  teacherLeaves.forEach(l => {
    db.run(`INSERT INTO teacher_leaves VALUES (?, ?, ?, ?, 'approved', ?)`, [l.id, l.teacher_id, l.leave_date, l.reason, now]);
  });

  const courses = [
    { id: 'c001', name: '少儿英语启蒙班', teacher_id: 't001', teacher_name: '王老师', capacity: 8, enrolled: 8, schedule: '周六 09:00-10:30', schedule_day: '周六', schedule_time: '09:00-10:30', campus_id: 'camp001', campus_name: '朝阳校区', package_id: 'pkg001', package_name: '启蒙套餐', priority: 3, fee: 8800, status: 'full' },
    { id: 'c002', name: '数学思维提升班', teacher_id: 't002', teacher_name: '李老师', capacity: 10, enrolled: 6, schedule: '周日 14:00-15:30', schedule_day: '周日', schedule_time: '14:00-15:30', campus_id: 'camp001', campus_name: '朝阳校区', package_id: 'pkg002', package_name: '进阶套餐', priority: 2, fee: 16000, status: 'active' },
    { id: 'c003', name: '创意美术班', teacher_id: 't003', teacher_name: '张老师', capacity: 12, enrolled: 12, schedule: '周六 14:00-16:00', schedule_day: '周六', schedule_time: '14:00-16:00', campus_id: 'camp002', campus_name: '海淀校区', package_id: 'pkg001', package_name: '启蒙套餐', priority: 1, fee: 8800, status: 'full' },
    { id: 'c004', name: '编程启蒙班', teacher_id: 't004', teacher_name: '陈老师', capacity: 10, enrolled: 3, schedule: '周日 09:00-10:30', schedule_day: '周日', schedule_time: '09:00-10:30', campus_id: 'camp002', campus_name: '海淀校区', package_id: 'pkg002', package_name: '进阶套餐', priority: 2, fee: 16000, status: 'active' },
    { id: 'c005', name: '钢琴一对一', teacher_id: 't005', teacher_name: '赵老师', capacity: 1, enrolled: 1, schedule: '预约制', schedule_day: '', schedule_time: '', campus_id: 'camp001', campus_name: '朝阳校区', package_id: 'pkg003', package_name: '精英套餐', priority: 5, fee: 25000, status: 'full' },
  ];
  courses.forEach(c => {
    db.run(`INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      c.id, c.name, c.teacher_id, c.teacher_name, c.capacity, c.enrolled,
      c.schedule, c.schedule_day, c.schedule_time, c.campus_id, c.campus_name,
      c.package_id, c.package_name, c.priority, c.fee, c.status, now
    ]);
  });

  const leadSources = [
    { id: 'src001', name: '线上推广', type: 'online' },
    { id: 'src002', name: '转介绍', type: 'referral' },
    { id: 'src003', name: '地推活动', type: 'offline' },
    { id: 'src004', name: '老学员推荐', type: 'referral' },
  ];
  leadSources.forEach(s => {
    db.run(`INSERT INTO lead_sources VALUES (?, ?, ?, 'active', ?)`, [s.id, s.name, s.type, now]);
  });

  const leads = [
    { id: 'l001', name: '小明', parent: '王建国', phone: '13800001111', age: 7, source: '线上推广', consultant: '刘顾问', status: 'trial_scheduled', course_id: 'c001', course_name: '少儿英语启蒙班', campus_id: 'camp001', campus_name: '朝阳校区', sales_attribution: '刘顾问' },
    { id: 'l002', name: '小红', parent: '李丽', phone: '13800002222', age: 8, source: '转介绍', consultant: '刘顾问', status: 'visited', course_id: 'c002', course_name: '数学思维提升班', campus_id: 'camp001', campus_name: '朝阳校区', sales_attribution: '刘顾问' },
    { id: 'l003', name: '小刚', parent: '张伟', phone: '13800003333', age: 6, source: '地推活动', consultant: '陈顾问', status: 'new', course_id: null, course_name: null, campus_id: 'camp001', campus_name: '朝阳校区', sales_attribution: '陈顾问' },
    { id: 'l004', name: '小美', parent: '赵芳', phone: '13800004444', age: 9, source: '线上推广', consultant: '陈顾问', status: 'trial_scheduled', course_id: 'c003', course_name: '创意美术班', campus_id: 'camp002', campus_name: '海淀校区', sales_attribution: '陈顾问' },
    { id: 'l005', name: '小华', parent: '孙磊', phone: '13800005555', age: 7, source: '老学员推荐', consultant: '刘顾问', status: 'enrolled', course_id: 'c002', course_name: '数学思维提升班', campus_id: 'camp001', campus_name: '朝阳校区', sales_attribution: '刘顾问' },
    { id: 'l006', name: '小强', parent: '周明', phone: '13800006666', age: 8, source: '地推活动', consultant: '陈顾问', status: 'no_show', course_id: 'c004', course_name: '编程启蒙班', campus_id: 'camp002', campus_name: '海淀校区', sales_attribution: '陈顾问' },
  ];
  leads.forEach(l => {
    db.run(`INSERT INTO leads VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`, [
      l.id, l.name, l.parent, l.phone, l.age, l.source, null,
      l.consultant, l.campus_id, l.campus_name, l.status, l.course_id,
      l.course_name, '', l.sales_attribution, now, now
    ]);
  });

  const parentContacts = [
    { id: 'pc001', lead_id: 'l001', relation: '父亲', name: '王建国', phone: '13800001111', is_primary: 1 },
    { id: 'pc002', lead_id: 'l002', relation: '母亲', name: '李丽', phone: '13800002222', is_primary: 1 },
    { id: 'pc003', lead_id: 'l003', relation: '父亲', name: '张伟', phone: '13800003333', is_primary: 1 },
  ];
  parentContacts.forEach(p => {
    db.run(`INSERT INTO parent_contacts VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      p.id, p.lead_id, p.relation, p.name, p.phone, null, p.is_primary, now
    ]);
  });

  const followUpPlans = [
    { id: 'fp001', lead_id: 'l001', plan_date: tomorrow, plan_content: '电话确认试听时间', follow_up_by: '刘顾问' },
    { id: 'fp002', lead_id: 'l003', plan_date: tomorrow, plan_content: '首次电话邀约试听', follow_up_by: '陈顾问' },
  ];
  followUpPlans.forEach(p => {
    db.run(`INSERT INTO follow_up_plans VALUES (?, ?, ?, ?, ?, 'pending', '', NULL, ?)`, [
      p.id, p.lead_id, p.plan_date, p.plan_content, p.follow_up_by, now
    ]);
  });

  const trials = [
    { id: 't001', lead_id: 'l001', name: '小明', course_id: 'c001', course_name: '少儿英语启蒙班', teacher_id: 't001', teacher_name: '王老师', date: threeDaysLater, time: '09:00', campus_id: 'camp001', campus_name: '朝阳校区', visited: 'no', visit_status: 'pending', feedback_status: 'pending', consultant: '刘顾问' },
    { id: 't002', lead_id: 'l002', name: '小红', course_id: 'c002', course_name: '数学思维提升班', teacher_id: 't002', teacher_name: '李老师', date: pastDate, time: '14:00', campus_id: 'camp001', campus_name: '朝阳校区', visited: 'yes', visit_status: 'visited', feedback_status: 'completed', consultant: '刘顾问' },
    { id: 't003', lead_id: 'l004', name: '小美', course_id: 'c003', course_name: '创意美术班', teacher_id: 't003', teacher_name: '张老师', date: dayAfterTomorrow, time: '14:00', campus_id: 'camp002', campus_name: '海淀校区', visited: 'no', visit_status: 'pending', feedback_status: 'pending', consultant: '陈顾问' },
    { id: 't004', lead_id: 'l006', name: '小强', course_id: 'c004', course_name: '编程启蒙班', teacher_id: 't004', teacher_name: '陈老师', date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), time: '09:00', campus_id: 'camp002', campus_name: '海淀校区', visited: 'no', visit_status: 'no_show', feedback_status: 'cancelled', consultant: '陈顾问' },
  ];
  trials.forEach(t => {
    db.run(`INSERT INTO trials VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      t.id, t.lead_id, t.name, t.course_id, t.course_name,
      t.teacher_id, t.teacher_name, t.date, t.time,
      t.campus_id, t.campus_name, t.visited, t.visit_status,
      t.feedback_status, t.consultant, now, now
    ]);
  });

  const visitRecords = [
    { id: 'vr001', trial_id: 't002', lead_id: 'l002', student_name: '小红', visit_time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'), visitor: '教务张老师', accompany_person: '母亲李丽', visit_status: 'visited', recorded_by: '教务张老师' },
    { id: 'vr002', trial_id: 't004', lead_id: 'l006', student_name: '小强', visit_time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm'), visitor: '教务李老师', accompany_person: '', visit_status: 'no_show', recorded_by: '教务李老师' },
  ];
  visitRecords.forEach(v => {
    db.run(`INSERT INTO visit_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      v.id, v.trial_id, v.lead_id, v.student_name, v.visit_time,
      v.visitor, v.accompany_person, v.visit_status, '', v.recorded_by, now
    ]);
  });

  const feedbacks = [
    { id: 'f001', trial_id: 't002', name: '小红', course_name: '数学思维提升班', teacher_id: 't002', teacher: '李老师', rating: 5, attention_rating: 5, interaction_rating: 4, understanding_rating: 5, content: '学生反应快，逻辑思维能力强，建议正式入学', suggestion: '可进入中级班学习', strengths: '理解力强，善于思考', weaknesses: '偶尔注意力不集中', recommend_level: 'high' },
  ];
  feedbacks.forEach(f => {
    db.run(`INSERT INTO feedbacks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      f.id, f.trial_id, f.name, f.course_name, f.teacher_id, f.teacher,
      f.rating, f.attention_rating, f.interaction_rating, f.understanding_rating,
      f.content, f.suggestion, f.strengths, f.weaknesses, f.recommend_level, now
    ]);
  });

  const coupons = [
    { id: 'cp001', code: 'NEW2024', name: '新人专享券', amount: 200, type: 'fixed', min_amount: 1000, student_name: null, expire_date: futureDate, used: 'no', status: 'active', stackable: 0, stack_group: null, course_ids: null, source: '新人礼包' },
    { id: 'cp002', code: 'VIP500', name: 'VIP会员券', amount: 500, type: 'fixed', min_amount: 2000, student_name: null, expire_date: futureDate, used: 'no', status: 'active', stackable: 1, stack_group: 'vip', course_ids: null, source: 'VIP活动' },
    { id: 'cp003', code: 'EXPIRED100', name: '过期体验券', amount: 100, type: 'fixed', min_amount: 500, student_name: null, expire_date: pastDate, used: 'no', status: 'expired', stackable: 0, stack_group: null, course_ids: null, source: '活动赠送' },
    { id: 'cp004', code: 'SUMMER300', name: '暑期特惠券', amount: 300, type: 'fixed', min_amount: 1500, student_name: '小红', expire_date: futureDate, used: 'no', status: 'active', stackable: 1, stack_group: 'summer', course_ids: null, source: '暑期活动' },
    { id: 'cp005', code: 'STACK100', name: '可叠加满减券', amount: 100, type: 'fixed', min_amount: 500, student_name: null, expire_date: futureDate, used: 'no', status: 'active', stackable: 1, stack_group: 'common', course_ids: null, source: '日常活动' },
  ];
  coupons.forEach(c => {
    db.run(`INSERT INTO coupons VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      c.id, c.code, c.name, c.amount, c.type, c.min_amount,
      c.student_name, c.expire_date, c.used, c.status,
      c.stackable, c.stack_group, c.course_ids, c.source, now
    ]);
  });

  const couponStacks = [
    { id: 'cs001', name: 'VIP专属组', max_stack_count: 1, stackable_types: 'fixed', status: 'active' },
    { id: 'cs002', name: '暑期活动组', max_stack_count: 1, stackable_types: 'fixed', status: 'active' },
    { id: 'cs003', name: '日常满减组', max_stack_count: 1, stackable_types: 'fixed,discount', status: 'active' },
  ];
  couponStacks.forEach(s => {
    db.run(`INSERT INTO coupon_stacks VALUES (?, ?, ?, ?, ?, ?)`, [
      s.id, s.name, s.max_stack_count, s.stackable_types, s.status, now
    ]);
  });

  const refundRules = [
    { id: 'rr001', name: '标准退费规则', description: '标准课程退费规则', before_start_refund_rate: 1, within_7_days_rate: 0.8, within_30_days_rate: 0.5, after_30_days_rate: 0, deduction_fee: 0 },
    { id: 'rr002', name: '特价班退费规则', description: '特价课程退费规则', before_start_refund_rate: 0.8, within_7_days_rate: 0.5, within_30_days_rate: 0.2, after_30_days_rate: 0, deduction_fee: 200 },
  ];
  refundRules.forEach(r => {
    db.run(`INSERT INTO refund_rules VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`, [
      r.id, r.name, r.description, r.before_start_refund_rate,
      r.within_7_days_rate, r.within_30_days_rate, r.after_30_days_rate,
      r.deduction_fee, now
    ]);
  });

  const contracts = [
    { id: 'ct001', contract_no: 'HT202401001', enrollment_id: 'e001', student_name: '小红', course_id: 'c002', course_name: '数学思维提升班', package_id: 'pkg002', package_name: '进阶套餐', original_amount: 16000, discount_amount: 300, final_amount: 15700, status: 'signed', sign_date: dayjs().format('YYYY-MM-DD'), effective_date: dayjs().format('YYYY-MM-DD'), expire_date: futureDate, signed_by: '教务张老师' },
  ];
  contracts.forEach(c => {
    db.run(`INSERT INTO contracts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      c.id, c.contract_no, c.enrollment_id, c.student_name,
      c.course_id, c.course_name, c.package_id, c.package_name,
      c.original_amount, c.discount_amount, c.final_amount,
      c.status, c.sign_date, c.effective_date, c.expire_date,
      c.signed_by, now
    ]);
  });

  const enrollments = [
    { id: 'e001', trial_id: 't002', lead_id: 'l002', name: '小红', course_id: 'c002', course_name: '数学思维提升班', campus_id: 'camp001', campus_name: '朝阳校区', package_id: 'pkg002', package_name: '进阶套餐', coupon_id: 'cp004', coupon_code: 'SUMMER300', discount_amount: 300, coupon_ids: 'cp004', coupon_codes: 'SUMMER300', original_fee: 16000, final_fee: 15700, operator: '教务张老师', consultant: '刘顾问', sales_attribution: '刘顾问', status: 'enrolled', approval_status: 'approved', contract_id: 'ct001', refund_rule_id: 'rr001' },
  ];
  enrollments.forEach(e => {
    db.run(`INSERT INTO enrollments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      e.id, e.trial_id, e.lead_id, e.name, e.course_id, e.course_name,
      e.campus_id, e.campus_name, e.package_id, e.package_name,
      e.coupon_id, e.coupon_code, e.discount_amount, e.coupon_ids, e.coupon_codes,
      e.original_fee, e.final_fee, e.operator, e.consultant, e.sales_attribution,
      e.status, e.approval_status, e.contract_id, e.refund_rule_id, now, now
    ]);
  });

  const waitlists = [
    { id: 'w001', trial_id: null, lead_id: null, name: '小龙', course_id: 'c001', course_name: '少儿英语启蒙班', campus_id: 'camp001', campus_name: '朝阳校区', coupon_id: null, coupon_code: null, discount_amount: 0, course_priority: 3, enroll_time: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), coupon_expire_date: null, operator: '教务张老师', consultant: '陈顾问', status: 'waiting', position: 1, sort_score: 50 },
    { id: 'w002', trial_id: null, lead_id: null, name: '小燕', course_id: 'c001', course_name: '少儿英语启蒙班', campus_id: 'camp001', campus_name: '朝阳校区', coupon_id: 'cp002', coupon_code: 'VIP500', discount_amount: 500, course_priority: 3, enroll_time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), coupon_expire_date: dayjs().add(2, 'day').format('YYYY-MM-DD'), operator: '教务李老师', consultant: '刘顾问', status: 'waiting', position: 2, sort_score: 64 },
    { id: 'w003', trial_id: null, lead_id: null, name: '小虎', course_id: 'c003', course_name: '创意美术班', campus_id: 'camp002', campus_name: '海淀校区', coupon_id: null, coupon_code: null, discount_amount: 0, course_priority: 1, enroll_time: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'), coupon_expire_date: null, operator: '教务王老师', consultant: '陈顾问', status: 'waiting', position: 1, sort_score: 46 },
  ];
  waitlists.forEach(w => {
    db.run(`INSERT INTO waitlists VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      w.id, w.trial_id, w.lead_id, w.name, w.course_id, w.course_name,
      w.campus_id, w.campus_name, w.coupon_id, w.coupon_code,
      w.discount_amount, w.course_priority, w.enroll_time,
      w.coupon_expire_date, w.operator, w.consultant,
      w.status, w.position, w.sort_score, now, now
    ]);
  });

  const ruleExplanations = [
    { id: 're001', rule_code: 'NO_VISIT_NO_ENROLL', rule_name: '未到访不能转正', category: '报名规则', description: '试听未到访的学员不能办理正式报名', condition: '试听记录 visited = no 或 visit_status != visited', result: '禁止报名，提示"试听未到访，不能办理转正报名"', example: '小明预约了周六的试听课但没来，不能直接报名正式班' },
    { id: 're002', rule_code: 'FULL_CLASS_WAITLIST', rule_name: '满班进候补', category: '报名规则', description: '课程已满班时，学员只能进入候补队列', condition: '课程 enrolled >= capacity', result: '无法直接报名，可加入候补队列，按候补排序规则等待转正', example: '英语班8人满员，第9位报名学员进入候补，排在第1位' },
    { id: 're003', rule_code: 'EXPIRED_COUPON', rule_name: '过期优惠券不能用', category: '优惠规则', description: '已过期的优惠券不能用于抵扣学费', condition: '优惠券 expire_date < 今天 且 status = active', result: '优惠券自动标记为expired，不可使用', example: '优惠券有效期到昨天，今天报名时无法使用' },
    { id: 're004', rule_code: 'NO_DUPLICATE_TRIAL', rule_name: '不能重复预约试听', category: '试听规则', description: '同一学员同一时间段不能重复预约试听', condition: '存在同一学员同一课程同一时间段的未完成试听', result: '预约失败，提示"该学员已有同时段试听安排"', example: '小明周六上午已预约英语试听，不能再预约周六上午的数学试听' },
    { id: 're005', rule_code: 'TEACHER_LEAVE_EFFECT', rule_name: '老师请假影响排课', category: '排课规则', description: '老师请假时，对应时段的试听课需要调整或取消', condition: '试听日期在老师请假日期范围内', result: '该时段不可排课，自动标记老师为不可用', example: '王老师下周三请假，所有王老师周三的试听课需要改期' },
    { id: 're006', rule_code: 'FEEDBACK_REQUIRED', rule_name: '反馈未完成不能转正', category: '报名规则', description: '老师未完成课堂反馈的试听，不能办理转正报名', condition: '试听 feedback_status != completed', result: '禁止报名，提示"课堂反馈未完成，请先让老师填写反馈"', example: '小红昨天试听了，但老师还没写反馈，今天不能报名' },
    { id: 're007', rule_code: 'WAITLIST_SORT_RULE', rule_name: '候补排序规则', category: '候补规则', description: '候补转正顺序按报名时间、课程优先级、优惠有效期综合计算', condition: '同一课程有多名候补学员等待转正', result: '按综合得分排序，得分高者优先转正', example: '报名早+课程优先级高+优惠券即将过期的候补学员优先转正' },
    { id: 're008', rule_code: 'COUPON_STACK_RULE', rule_name: '优惠叠加规则', category: '优惠规则', description: '部分优惠券可以叠加使用，但有数量和类型限制', condition: '多张优惠券均标记为可叠加且属于不同叠加组', result: '可同时使用多张优惠券，总优惠金额累加', example: 'VIP券 + 暑期券可以叠加使用，共减免800元' },
  ];
  ruleExplanations.forEach(r => {
    db.run(`INSERT INTO rule_explanations VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`, [
      r.id, r.rule_code, r.rule_name, r.category,
      r.description, r.condition, r.result, r.example, now
    ]);
  });

  console.log('🌱 种子数据已插入');
}

// ============ API Routes ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: dayjs().format('YYYY-MM-DD HH:mm:ss') });
});

app.get('/api/campuses', (req, res) => {
  const campuses = queryAll("SELECT * FROM campuses WHERE status = 'active' ORDER BY id");
  res.json(campuses);
});

app.get('/api/course-packages', (req, res) => {
  const packages = queryAll("SELECT * FROM course_packages WHERE status = 'active' ORDER BY id");
  res.json(packages);
});

app.get('/api/teachers', (req, res) => {
  const { campus_id } = req.query;
  let sql = "SELECT * FROM teachers WHERE status = 'active'";
  if (campus_id) sql += ` AND campus_id = '${campus_id}'`;
  sql += " ORDER BY id";
  const teachers = queryAll(sql);
  res.json(teachers);
});

app.get('/api/teacher-schedules', (req, res) => {
  const { teacher_id } = req.query;
  let sql = "SELECT ts.*, t.name as teacher_name FROM teacher_schedules ts LEFT JOIN teachers t ON ts.teacher_id = t.id WHERE ts.status = 'active'";
  if (teacher_id) sql += ` AND ts.teacher_id = '${teacher_id}'`;
  sql += " ORDER BY ts.day_of_week, ts.start_time";
  const schedules = queryAll(sql);
  res.json(schedules);
});

app.get('/api/teacher-leaves', (req, res) => {
  const { teacher_id, date } = req.query;
  let sql = "SELECT tl.*, t.name as teacher_name FROM teacher_leaves tl LEFT JOIN teachers t ON tl.teacher_id = t.id WHERE tl.status = 'approved'";
  if (teacher_id) sql += ` AND tl.teacher_id = '${teacher_id}'`;
  if (date) sql += ` AND tl.leave_date = '${date}'`;
  sql += " ORDER BY tl.leave_date DESC";
  const leaves = queryAll(sql);
  res.json(leaves);
});

app.get('/api/lead-sources', (req, res) => {
  const sources = queryAll("SELECT * FROM lead_sources WHERE status = 'active' ORDER BY id");
  res.json(sources);
});

app.get('/api/refund-rules', (req, res) => {
  const rules = queryAll("SELECT * FROM refund_rules WHERE status = 'active' ORDER BY id");
  res.json(rules);
});

app.get('/api/rule-explanations', (req, res) => {
  const { category } = req.query;
  let sql = "SELECT * FROM rule_explanations WHERE status = 'active'";
  if (category) sql += ` AND category = '${category}'`;
  sql += " ORDER BY category, id";
  const rules = queryAll(sql);
  res.json(rules);
});

app.get('/api/dashboard/stats', (req, res) => {
  const leads = queryOne("SELECT COUNT(*) as cnt FROM leads")?.cnt || 0;
  const trials = queryOne("SELECT COUNT(*) as cnt FROM trials")?.cnt || 0;
  const visited = queryOne("SELECT COUNT(*) as cnt FROM trials WHERE visited = 'yes'")?.cnt || 0;
  const feedbacks = queryOne("SELECT COUNT(*) as cnt FROM feedbacks")?.cnt || 0;
  const enrollments = queryOne("SELECT COUNT(*) as cnt FROM enrollments WHERE status = 'enrolled'")?.cnt || 0;
  const waitlists = queryOne("SELECT COUNT(*) as cnt FROM waitlists WHERE status = 'waiting'")?.cnt || 0;
  const contracts = queryOne("SELECT COUNT(*) as cnt FROM contracts WHERE status = 'signed'")?.cnt || 0;

  const recentLeads = queryAll("SELECT * FROM leads ORDER BY created_at DESC LIMIT 5");
  const recentTrials = queryAll("SELECT * FROM trials ORDER BY created_at DESC LIMIT 5");

  const funnelData = {
    leads,
    trials,
    visited,
    feedbacks,
    enrollments,
    waitlists,
    contracts,
    conversionRate: leads > 0 ? ((enrollments / leads) * 100).toFixed(1) : '0',
    visitRate: trials > 0 ? ((visited / trials) * 100).toFixed(1) : '0',
    trialToEnrollRate: visited > 0 ? ((enrollments / visited) * 100).toFixed(1) : '0',
  };

  const consultantStats = queryAll(`
    SELECT consultant, 
           COUNT(*) as lead_count,
           SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as enroll_count
    FROM leads 
    WHERE consultant IS NOT NULL 
    GROUP BY consultant 
    ORDER BY lead_count DESC
  `);

  res.json({
    leads,
    trials,
    visited,
    feedbacks,
    enrollments,
    waitlists,
    contracts,
    ...funnelData,
    recentLeads,
    recentTrials,
    consultantStats,
  });
});

app.get('/api/dashboard/funnel', (req, res) => {
  const leads = queryOne("SELECT COUNT(*) as cnt FROM leads")?.cnt || 0;
  const trials = queryOne("SELECT COUNT(*) as cnt FROM trials")?.cnt || 0;
  const visited = queryOne("SELECT COUNT(*) as cnt FROM trials WHERE visited = 'yes'")?.cnt || 0;
  const feedbackDone = queryOne("SELECT COUNT(*) as cnt FROM trials WHERE feedback_status = 'completed'")?.cnt || 0;
  const enrolled = queryOne("SELECT COUNT(*) as cnt FROM enrollments WHERE status = 'enrolled'")?.cnt || 0;
  const waiting = queryOne("SELECT COUNT(*) as cnt FROM waitlists WHERE status = 'waiting'")?.cnt || 0;

  res.json({
    stages: [
      { name: '线索池', value: leads, rate: '100%' },
      { name: '预约试听', value: trials, rate: leads > 0 ? ((trials / leads) * 100).toFixed(1) + '%' : '0%' },
      { name: '实际到访', value: visited, rate: trials > 0 ? ((visited / trials) * 100).toFixed(1) + '%' : '0%' },
      { name: '完成反馈', value: feedbackDone, rate: visited > 0 ? ((feedbackDone / visited) * 100).toFixed(1) + '%' : '0%' },
      { name: '正式报名', value: enrolled, rate: feedbackDone > 0 ? ((enrolled / feedbackDone) * 100).toFixed(1) + '%' : '0%' },
      { name: '候补等待', value: waiting, rate: '---' },
    ],
    overallConversion: leads > 0 ? ((enrolled / leads) * 100).toFixed(1) + '%' : '0%',
  });
});

app.get('/api/funnel', (req, res) => {
  const leads = queryOne("SELECT COUNT(*) as cnt FROM leads")?.cnt || 0;
  const trialScheduled = queryOne("SELECT COUNT(*) as cnt FROM trials")?.cnt || 0;
  const visited = queryOne("SELECT COUNT(*) as cnt FROM trials WHERE visited = 'yes'")?.cnt || 0;
  const noShow = queryOne("SELECT COUNT(*) as cnt FROM trials WHERE visit_status = 'no_show'")?.cnt || 0;
  const feedbackDone = queryOne("SELECT COUNT(*) as cnt FROM trials WHERE feedback_status = 'completed'")?.cnt || 0;
  const enrolled = queryOne("SELECT COUNT(*) as cnt FROM enrollments WHERE status = 'enrolled'")?.cnt || 0;
  const waitlisted = queryOne("SELECT COUNT(*) as cnt FROM waitlists WHERE status = 'waiting'")?.cnt || 0;

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const dayLeads = queryOne("SELECT COUNT(*) as cnt FROM leads WHERE DATE(created_at) = ?", [date])?.cnt || 0;
    const dayEnrolled = queryOne("SELECT COUNT(*) as cnt FROM enrollments WHERE DATE(created_at) = ?", [date])?.cnt || 0;
    last7Days.push({
      date,
      leads: dayLeads,
      enrolled: dayEnrolled,
      conversion: dayLeads > 0 ? ((dayEnrolled / dayLeads) * 100).toFixed(1) : '0'
    });
  }

  res.json({
    leads,
    trial_scheduled: trialScheduled,
    visited,
    feedback_done: feedbackDone,
    enrolled,
    waitlisted,
    no_show: noShow,
    last7Days
  });
});

app.get('/api/courses', (req, res) => {
  const { campus_id, status } = req.query;
  let sql = "SELECT * FROM courses WHERE 1=1";
  if (campus_id) sql += ` AND campus_id = '${campus_id}'`;
  if (status) sql += ` AND status = '${status}'`;
  sql += " ORDER BY priority DESC, id";
  const courses = queryAll(sql);
  res.json(courses);
});

app.get('/api/courses/:id', (req, res) => {
  const course = queryOne("SELECT * FROM courses WHERE id = ?", [req.params.id]);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }
  res.json(course);
});

app.get('/api/leads', (req, res) => {
  const { consultant, status, campus_id, keyword } = req.query;
  let sql = "SELECT * FROM leads WHERE 1=1";
  if (consultant) sql += ` AND consultant = '${consultant}'`;
  if (status) sql += ` AND status = '${status}'`;
  if (campus_id) sql += ` AND campus_id = '${campus_id}'`;
  if (keyword) sql += ` AND (student_name LIKE '%${keyword}%' OR phone LIKE '%${keyword}%' OR parent_name LIKE '%${keyword}%')`;
  sql += " ORDER BY created_at DESC";
  const leads = queryAll(sql);
  res.json(leads);
});

app.get('/api/leads/:id', (req, res) => {
  const lead = queryOne("SELECT * FROM leads WHERE id = ?", [req.params.id]);
  if (!lead) {
    return res.status(404).json({ error: '线索不存在' });
  }
  
  const versions = queryAll("SELECT * FROM lead_versions WHERE lead_id = ? ORDER BY version DESC", [req.params.id]);
  const contacts = queryAll("SELECT * FROM parent_contacts WHERE lead_id = ? ORDER BY is_primary DESC", [req.params.id]);
  const followUps = queryAll("SELECT * FROM follow_up_plans WHERE lead_id = ? ORDER BY plan_date DESC", [req.params.id]);
  const trials = queryAll("SELECT * FROM trials WHERE lead_id = ? ORDER BY created_at DESC", [req.params.id]);
  
  res.json({ lead, versions, contacts, followUps, trials });
});

app.post('/api/leads', (req, res) => {
  const { student_name, parent_name, phone, age, source, source_id, consultant, campus_id, campus_name, course_id, course_name, remark, sales_attribution } = req.body;
  if (!student_name || !phone) {
    return res.status(400).json({ error: '学员姓名和联系电话必填' });
  }
  const id = 'l' + uuidv4().slice(0, 8);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  db.run(`INSERT INTO leads (id, student_name, parent_name, phone, age, source, source_id, consultant, campus_id, campus_name, status, course_id, course_name, remark, version, sales_attribution, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, 1, ?, ?, ?)`, 
    [id, student_name, parent_name || null, phone, age || null, source || null, source_id || null, 
     consultant || null, campus_id || null, campus_name || null, 
     course_id || null, course_name || null, remark || '', 
     sales_attribution || consultant || '', now, now]);
  
  if (parent_name && phone) {
    const contactId = 'pc' + uuidv4().slice(0, 6);
    db.run(`INSERT INTO parent_contacts VALUES (?, ?, '家长', ?, ?, NULL, 1, ?)`, [
      contactId, id, parent_name, phone, now
    ]);
  }
  
  addAuditLog('create', 'lead', id, student_name, consultant || 'system', 'consultant', null, { student_name, phone });
  persist();
  res.json({ id, message: '线索创建成功' });
});

app.put('/api/leads/:id', (req, res) => {
  const { status, remark, course_id, course_name, consultant, sales_attribution } = req.body;
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const oldLead = queryOne("SELECT * FROM leads WHERE id = ?", [req.params.id]);
  if (!oldLead) {
    return res.status(404).json({ error: '线索不存在' });
  }
  
  createLeadVersion(req.params.id, consultant || 'system', '更新线索信息');
  
  const updates = [];
  const params = [];
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (remark !== undefined) { updates.push('remark = ?'); params.push(remark); }
  if (course_id !== undefined) { updates.push('course_id = ?'); params.push(course_id); }
  if (course_name !== undefined) { updates.push('course_name = ?'); params.push(course_name); }
  if (consultant !== undefined) { updates.push('consultant = ?'); params.push(consultant); }
  if (sales_attribution !== undefined) { updates.push('sales_attribution = ?'); params.push(sales_attribution); }
  updates.push('updated_at = ?');
  params.push(now);
  params.push(req.params.id);
  
  db.run(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
  
  const newLead = queryOne("SELECT * FROM leads WHERE id = ?", [req.params.id]);
  addAuditLog('update', 'lead', req.params.id, oldLead.student_name, consultant || 'system', 'consultant', oldLead, newLead);
  
  persist();
  res.json({ message: '线索已更新' });
});

app.get('/api/leads/:id/versions', (req, res) => {
  const versions = queryAll("SELECT * FROM lead_versions WHERE lead_id = ? ORDER BY version DESC", [req.params.id]);
  res.json(versions);
});

app.get('/api/follow-up-plans', (req, res) => {
  const { lead_id, status, follow_up_by } = req.query;
  let sql = "SELECT * FROM follow_up_plans WHERE 1=1";
  if (lead_id) sql += ` AND lead_id = '${lead_id}'`;
  if (status) sql += ` AND status = '${status}'`;
  if (follow_up_by) sql += ` AND follow_up_by = '${follow_up_by}'`;
  sql += " ORDER BY plan_date DESC";
  const plans = queryAll(sql);
  res.json(plans);
});

app.post('/api/follow-up-plans', (req, res) => {
  const { lead_id, plan_date, plan_content, follow_up_by } = req.body;
  if (!lead_id || !plan_date || !plan_content) {
    return res.status(400).json({ error: '线索、计划日期和内容必填' });
  }
  const id = 'fp' + uuidv4().slice(0, 6);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  db.run(`INSERT INTO follow_up_plans VALUES (?, ?, ?, ?, ?, 'pending', '', NULL, ?)`, [
    id, lead_id, plan_date, plan_content, follow_up_by || '', now
  ]);
  
  addAuditLog('create', 'follow_up', id, '', follow_up_by || 'system', 'consultant', null, { lead_id, plan_date });
  persist();
  res.json({ id, message: '跟进计划已创建' });
});

app.put('/api/follow-up-plans/:id', (req, res) => {
  const { status, result, actual_date } = req.body;
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const updates = [];
  const params = [];
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (result !== undefined) { updates.push('result = ?'); params.push(result); }
  if (actual_date !== undefined) { updates.push('actual_date = ?'); params.push(actual_date); }
  params.push(req.params.id);
  
  db.run(`UPDATE follow_up_plans SET ${updates.join(', ')} WHERE id = ?`, params);
  
  persist();
  res.json({ message: '跟进计划已更新' });
});

app.get('/api/trials', (req, res) => {
  const { teacher_id, status, campus_id, date } = req.query;
  let sql = "SELECT * FROM trials WHERE 1=1";
  if (teacher_id) sql += ` AND teacher_id = '${teacher_id}'`;
  if (status === 'pending') sql += ` AND visit_status = 'pending'`;
  if (status === 'visited') sql += ` AND visited = 'yes'`;
  if (status === 'no_show') sql += ` AND visit_status = 'no_show'`;
  if (campus_id) sql += ` AND campus_id = '${campus_id}'`;
  if (date) sql += ` AND trial_date = '${date}'`;
  sql += " ORDER BY trial_date DESC, created_at DESC";
  const trials = queryAll(sql);
  res.json(trials);
});

app.get('/api/trials/:id', (req, res) => {
  const trial = queryOne("SELECT * FROM trials WHERE id = ?", [req.params.id]);
  if (!trial) {
    return res.status(404).json({ error: '试听记录不存在' });
  }
  
  const feedback = queryOne("SELECT * FROM feedbacks WHERE trial_id = ?", [req.params.id]);
  const visitRecords = queryAll("SELECT * FROM visit_records WHERE trial_id = ? ORDER BY created_at DESC", [req.params.id]);
  
  res.json({ trial, feedback, visitRecords });
});

app.post('/api/trials/check', (req, res) => {
  const { lead_id, course_id, teacher_id, trial_date } = req.body;
  const errors = [];

  if (!lead_id || !course_id || !trial_date) {
    return res.status(400).json({ can_schedule: false, errors: ['线索、课程和试听日期必填'] });
  }

  const existingTrial = queryOne(
    `SELECT * FROM trials WHERE lead_id = ? AND trial_date = ? AND (visit_status = 'pending' OR visit_status = 'visited')`,
    [lead_id, trial_date]
  );
  if (existingTrial) {
    errors.push('该学员当天已有试听安排，不能重复预约');
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = ?`, [course_id]);
  if (!course) {
    errors.push('课程不存在');
  } else {
    if (course.enrolled >= course.capacity) {
      errors.push('该课程已满班');
    }
  }

  const tid = teacher_id || (course && course.teacher_id);
  if (tid && trial_date) {
    const leave = queryOne(
      `SELECT * FROM teacher_leaves WHERE teacher_id = ? AND leave_date = ? AND status = 'approved'`,
      [tid, trial_date]
    );
    if (leave) {
      errors.push('该老师当天请假，请选择其他日期或老师');
    }
  }

  res.json({
    can_schedule: errors.length === 0,
    errors,
  });
});

app.post('/api/trials', (req, res) => {
  const { lead_id, student_name, course_id, trial_date, trial_time, consultant, teacher_id } = req.body;
  if (!lead_id || !course_id || !trial_date) {
    return res.status(400).json({ error: '线索、课程和试听日期必填' });
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = ?`, [course_id]);
  if (!course) {
    return res.status(400).json({ error: '课程不存在' });
  }

  const existingTrial = queryOne(
    `SELECT * FROM trials WHERE lead_id = ? AND trial_date = ? AND (visit_status = 'pending' OR visit_status = 'visited')`,
    [lead_id, trial_date]
  );
  if (existingTrial) {
    return res.status(400).json({ error: '该学员当天已有试听安排，不能重复预约' });
  }

  if (teacher_id && trial_date) {
    const leave = queryOne(
      `SELECT * FROM teacher_leaves WHERE teacher_id = ? AND leave_date = ? AND status = 'approved'`,
      [teacher_id, trial_date]
    );
    if (leave) {
      return res.status(400).json({ error: '该老师当天请假，请选择其他日期或老师' });
    }
  }

  const id = 't' + uuidv4().slice(0, 8);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const teacherName = course.teacher_name || '';

  db.run(`INSERT INTO trials (id, lead_id, student_name, course_id, course_name, teacher_id, teacher_name, trial_date, trial_time, campus_id, campus_name, visited, visit_status, feedback_status, consultant, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'no', 'pending', 'pending', ?, ?, ?)`, 
    [id, lead_id, student_name, course_id, course.name, 
     teacher_id || course.teacher_id || null, teacherName,
     trial_date, trial_time || null, 
     course.campus_id, course.campus_name,
     consultant || '', now, now]);

  db.run(`UPDATE leads SET status = 'trial_scheduled', updated_at = ? WHERE id = ?`, [now, lead_id]);

  addAuditLog('create', 'trial', id, student_name, consultant || 'system', 'consultant', null, { course: course.name, trial_date });
  persist();
  res.json({ id, message: '试听安排成功' });
});

app.put('/api/trials/:id/visit', (req, res) => {
  const { visited, visit_status, operator, accompany_person, visit_time, remark } = req.body;
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const trial = queryOne(`SELECT * FROM trials WHERE id = ?`, [req.params.id]);
  if (!trial) {
    return res.status(404).json({ error: '试听记录不存在' });
  }

  db.run(`UPDATE trials SET visited = ?, visit_status = ?, updated_at = ? WHERE id = ?`, 
    [visited, visit_status, now, req.params.id]);

  const recordId = 'vr' + uuidv4().slice(0, 6);
  db.run(`INSERT INTO visit_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    recordId, req.params.id, trial.lead_id, trial.student_name,
    visit_time || now, operator || 'system', accompany_person || '',
    visit_status, remark || '', operator || 'system', now
  ]);

  if (visited === 'yes') {
    db.run(`UPDATE leads SET status = 'visited', updated_at = ? WHERE id = ?`, [now, trial.lead_id]);
  } else if (visit_status === 'no_show') {
    db.run(`UPDATE leads SET status = 'no_show', updated_at = ? WHERE id = ?`, [now, trial.lead_id]);
  }

  addAuditLog('update', 'trial', req.params.id, trial.student_name, operator || 'system', 'admin', 
    { visited: trial.visited, visit_status: trial.visit_status }, 
    { visited, visit_status });

  persist();
  res.json({ message: '到访状态已更新' });
});

app.get('/api/feedbacks', (req, res) => {
  const { teacher_id, trial_id } = req.query;
  let sql = "SELECT f.*, t.trial_date, t.course_id FROM feedbacks f LEFT JOIN trials t ON f.trial_id = t.id WHERE 1=1";
  if (teacher_id) sql += ` AND f.teacher_id = '${teacher_id}'`;
  if (trial_id) sql += ` AND f.trial_id = '${trial_id}'`;
  sql += " ORDER BY f.created_at DESC";
  const feedbacks = queryAll(sql);
  res.json(feedbacks);
});

app.post('/api/feedbacks', (req, res) => {
  const { trial_id, student_name, course_name, teacher_id, teacher, rating, attention_rating, interaction_rating, understanding_rating, content, suggestion, strengths, weaknesses, recommend_level } = req.body;
  if (!trial_id || !teacher) {
    return res.status(400).json({ error: '试听记录和老师必填' });
  }

  const existing = queryOne(`SELECT * FROM feedbacks WHERE trial_id = ?`, [trial_id]);
  if (existing) {
    return res.status(400).json({ error: '该试听已有反馈，不可重复提交' });
  }

  const id = 'f' + uuidv4().slice(0, 8);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.run(`INSERT INTO feedbacks (id, trial_id, student_name, course_name, teacher_id, teacher, rating, attention_rating, interaction_rating, understanding_rating, content, suggestion, strengths, weaknesses, recommend_level, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [id, trial_id, student_name || '', course_name || '', teacher_id || null, teacher,
     rating || null, attention_rating || null, interaction_rating || null, understanding_rating || null,
     content || '', suggestion || '', strengths || '', weaknesses || '', recommend_level || '', now]);

  db.run(`UPDATE trials SET feedback_status = 'completed', updated_at = ? WHERE id = ?`, [now, trial_id]);

  addAuditLog('create', 'feedback', id, student_name, teacher, 'teacher', null, { rating, content });
  persist();
  res.json({ id, message: '反馈提交成功' });
});

app.get('/api/coupons', (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  db.run(`UPDATE coupons SET status = 'expired' WHERE expire_date < ? AND status = 'active'`, [today]);
  
  const { student_name, status } = req.query;
  let sql = "SELECT * FROM coupons WHERE 1=1";
  if (student_name) sql += ` AND (student_name IS NULL OR student_name = '${student_name}')`;
  if (status) sql += ` AND status = '${status}'`;
  sql += " ORDER BY created_at DESC";
  const coupons = queryAll(sql);
  res.json(coupons);
});

app.get('/api/coupon-stacks', (req, res) => {
  const stacks = queryAll("SELECT * FROM coupon_stacks WHERE status = 'active' ORDER BY id");
  res.json(stacks);
});

app.post('/api/coupons/check', (req, res) => {
  const { code, course_id, amount } = req.body;
  if (!code) {
    return res.status(400).json({ error: '请输入优惠券码' });
  }
  const today = dayjs().format('YYYY-MM-DD');
  const coupon = queryOne(`SELECT * FROM coupons WHERE code = ? AND used = 'no'`, [code]);
  if (!coupon) {
    return res.json({ valid: false, reason: '优惠券不存在或已使用' });
  }
  if (coupon.status === 'expired' || coupon.expire_date < today) {
    return res.json({ valid: false, reason: '优惠券已过期，不能抵扣', coupon });
  }
  if (coupon.min_amount > 0 && amount && amount < coupon.min_amount) {
    return res.json({ valid: false, reason: `未满${coupon.min_amount}元，不可使用该券`, coupon });
  }
  res.json({ valid: true, coupon });
});

app.post('/api/coupons/check-stack', (req, res) => {
  const { coupon_ids = [], course_id, amount } = req.body;
  const today = dayjs().format('YYYY-MM-DD');
  const errors = [];
  const validCoupons = [];
  let totalDiscount = 0;
  const groups = {};

  for (const cid of coupon_ids) {
    const coupon = queryOne(`SELECT * FROM coupons WHERE id = ? AND used = 'no'`, [cid]);
    if (!coupon) {
      errors.push(`优惠券 ${cid} 不存在或已使用`);
      continue;
    }
    if (coupon.status === 'expired' || coupon.expire_date < today) {
      errors.push(`优惠券「${coupon.name}」已过期`);
      continue;
    }
    
    if (coupon.stackable && coupon.stack_group) {
      if (!groups[coupon.stack_group]) {
        groups[coupon.stack_group] = [];
      }
      groups[coupon.stack_group].push(coupon);
    } else {
      validCoupons.push(coupon);
      totalDiscount += coupon.amount;
    }
  }

  for (const group in groups) {
    if (groups[group].length > 1) {
      errors.push(`同组优惠券「${group}」只能使用一张`);
    } else {
      validCoupons.push(groups[group][0]);
      totalDiscount += groups[group][0].amount;
    }
  }

  if (amount && totalDiscount >= amount) {
    totalDiscount = amount;
  }

  res.json({
    valid: errors.length === 0,
    errors,
    valid_coupons: validCoupons,
    total_discount: totalDiscount,
  });
});

app.get('/api/enrollments', (req, res) => {
  const { status, campus_id } = req.query;
  let sql = "SELECT * FROM enrollments WHERE 1=1";
  if (status) sql += ` AND status = '${status}'`;
  if (campus_id) sql += ` AND campus_id = '${campus_id}'`;
  sql += " ORDER BY created_at DESC";
  const enrollments = queryAll(sql);
  res.json(enrollments);
});

app.get('/api/enrollments/:id', (req, res) => {
  const enrollment = queryOne("SELECT * FROM enrollments WHERE id = ?", [req.params.id]);
  if (!enrollment) {
    return res.status(404).json({ error: '报名记录不存在' });
  }
  
  const contract = queryOne("SELECT * FROM contracts WHERE id = ?", [enrollment.contract_id]);
  const approvals = queryAll("SELECT * FROM enrollment_approvals WHERE enrollment_id = ? ORDER BY created_at DESC", [req.params.id]);
  
  res.json({ enrollment, contract, approvals });
});

app.post('/api/enrollments/check', (req, res) => {
  const { trial_id, course_id, coupon_ids = [] } = req.body;
  const errors = [];
  const warnings = [];
  const info = [];

  const trial = queryOne(`SELECT * FROM trials WHERE id = ?`, [trial_id]);
  if (!trial) {
    errors.push('试听记录不存在');
    return res.json({ can_enroll: false, errors, warnings, info });
  }

  if (trial.visited !== 'yes') {
    errors.push('试听未到访，不能办理转正报名');
  }

  if (trial.feedback_status !== 'completed') {
    errors.push('课堂反馈未完成，请先让老师填写反馈后再办理转正');
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = ?`, [course_id]);
  if (!course) {
    errors.push('课程不存在');
  } else if (course.enrolled >= course.capacity) {
    warnings.push(`课程「${course.name}」已满班(${course.enrolled}/${course.capacity})，只能进入候补`);
    info.push('候补转正按报名时间、课程优先级和优惠有效期综合排序');
  }

  const existingEnroll = queryOne(`SELECT * FROM enrollments WHERE trial_id = ? AND status = 'enrolled'`, [trial_id]);
  if (existingEnroll) {
    errors.push('该学员已报名，不可重复报名');
  }

  if (coupon_ids && coupon_ids.length > 0) {
    const today = dayjs().format('YYYY-MM-DD');
    let totalDiscount = 0;
    const groups = {};
    
    for (const cid of coupon_ids) {
      const coupon = queryOne(`SELECT * FROM coupons WHERE id = ? AND used = 'no'`, [cid]);
      if (!coupon) {
        errors.push(`优惠券不存在或已使用`);
      } else if (coupon.expire_date < today) {
        errors.push(`优惠券「${coupon.name}」已过期，不能抵扣`);
      } else if (coupon.min_amount > 0 && course && course.fee < coupon.min_amount) {
        warnings.push(`优惠券「${coupon.name}」未满${coupon.min_amount}元不可用`);
      } else {
        totalDiscount += coupon.amount;
        if (coupon.stackable && coupon.stack_group) {
          if (!groups[coupon.stack_group]) groups[coupon.stack_group] = 0;
          groups[coupon.stack_group]++;
        }
      }
    }
    
    for (const g in groups) {
      if (groups[g] > 1) {
        errors.push(`同组「${g}」优惠券只能使用一张，不能叠加`);
      }
    }
  }

  res.json({
    can_enroll: errors.length === 0,
    is_waitlist: warnings.length > 0 && errors.length === 0,
    errors,
    warnings,
    info,
    trial,
    course,
  });
});

app.post('/api/enrollments', (req, res) => {
  const { trial_id, lead_id, student_name, course_id, coupon_ids = [], coupon_codes, original_fee, final_fee, operator, consultant, sales_attribution, campus_id, campus_name, package_id, package_name, refund_rule_id } = req.body;

  const check = queryOne(`SELECT visited, feedback_status FROM trials WHERE id = ?`, [trial_id]);
  if (!check || check.visited !== 'yes') {
    return res.status(400).json({ error: '试听未到访，不能办理转正报名' });
  }
  if (check.feedback_status !== 'completed') {
    return res.status(400).json({ error: '课堂反馈未完成，不能办理转正' });
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = ?`, [course_id]);
  if (!course) {
    return res.status(400).json({ error: '课程不存在' });
  }
  if (course.enrolled >= course.capacity) {
    return res.status(400).json({ error: '课程已满班，请加入候补' });
  }

  const today = dayjs().format('YYYY-MM-DD');
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  let totalDiscount = 0;
  const validCouponIds = [];
  const validCouponCodes = [];

  for (const cid of coupon_ids) {
    const coupon = queryOne(`SELECT * FROM coupons WHERE id = ? AND used = 'no'`, [cid]);
    if (coupon && coupon.expire_date >= today) {
      totalDiscount += coupon.amount;
      validCouponIds.push(cid);
      validCouponCodes.push(coupon.code);
    }
  }

  const id = 'e' + uuidv4().slice(0, 8);
  const origFee = original_fee || course.fee || 0;
  const finFee = Math.max(0, origFee - totalDiscount);

  db.run(`INSERT INTO enrollments (id, trial_id, lead_id, student_name, course_id, course_name, campus_id, campus_name, package_id, package_name, coupon_id, coupon_code, discount_amount, coupon_ids, coupon_codes, original_fee, final_fee, operator, consultant, sales_attribution, status, approval_status, contract_id, refund_rule_id, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enrolled', 'approved', NULL, ?, ?, ?)`, 
    [id, trial_id || null, lead_id || null, student_name, course_id, course.name,
     campus_id || course.campus_id, campus_name || course.campus_name,
     package_id || course.package_id, package_name || course.package_name,
     validCouponIds[0] || null, validCouponCodes[0] || '', totalDiscount,
     validCouponIds.join(','), validCouponCodes.join(','),
     origFee, finFee, operator || 'system', consultant || '', 
     sales_attribution || consultant || '', refund_rule_id || 'rr001', now, now]);

  db.run(`UPDATE courses SET enrolled = enrolled + 1, status = CASE WHEN enrolled + 1 >= capacity THEN 'full' ELSE 'active' END WHERE id = ?`, [course_id]);

  for (const cid of validCouponIds) {
    db.run(`UPDATE coupons SET used = 'yes', status = 'used' WHERE id = ?`, [cid]);
  }

  if (trial_id) {
    const trialInfo = queryOne(`SELECT lead_id FROM trials WHERE id = ?`, [trial_id]);
    if (trialInfo) {
      db.run(`UPDATE leads SET status = 'enrolled', updated_at = ? WHERE id = ?`, [now, trialInfo.lead_id]);
    }
  }

  const contractNo = 'HT' + dayjs().format('YYYYMM') + String(Math.floor(Math.random() * 9000) + 1000);
  const contractId = 'ct' + uuidv4().slice(0, 6);
  db.run(`INSERT INTO contracts (id, contract_no, enrollment_id, student_name, course_id, course_name, package_id, package_name, original_amount, discount_amount, final_amount, status, sign_date, effective_date, expire_date, signed_by, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'signed', ?, ?, ?, ?, ?)`, 
    [contractId, contractNo, id, student_name, course_id, course.name,
     package_id || course.package_id, package_name || course.package_name,
     origFee, totalDiscount, finFee, now, now, 
     dayjs().add(365, 'day').format('YYYY-MM-DD'), operator || 'system', now]);

  db.run(`UPDATE enrollments SET contract_id = ? WHERE id = ?`, [contractId, id]);

  addAuditLog('create', 'enrollment', id, student_name, operator || 'system', 'admin', null, { course: course.name, final_fee: finFee });
  persist();
  res.json({ id, contract_id: contractId, message: '报名成功，合同已生成' });
});

app.get('/api/waitlists', (req, res) => {
  const { course_id, status, campus_id } = req.query;
  let sql = "SELECT * FROM waitlists WHERE 1=1";
  if (course_id) sql += ` AND course_id = '${course_id}'`;
  if (status) sql += ` AND status = '${status}'`;
  if (campus_id) sql += ` AND campus_id = '${campus_id}'`;
  sql += " ORDER BY sort_score DESC, created_at ASC";
  const waitlists = queryAll(sql);
  res.json(waitlists);
});

app.post('/api/waitlists', (req, res) => {
  const { trial_id, lead_id, student_name, course_id, coupon_id, coupon_code, discount_amount, operator, consultant, campus_id, campus_name, course_priority } = req.body;

  const today = dayjs().format('YYYY-MM-DD');
  let couponExpire = null;
  if (coupon_id) {
    const coupon = queryOne(`SELECT * FROM coupons WHERE id = ?`, [coupon_id]);
    if (!coupon) {
      return res.status(400).json({ error: '优惠券不存在' });
    }
    if (coupon.expire_date < today) {
      return res.status(400).json({ error: '优惠券已过期，不能抵扣' });
    }
    couponExpire = coupon.expire_date;
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = ?`, [course_id]);
  if (!course) {
    return res.status(400).json({ error: '课程不存在' });
  }

  const id = 'w' + uuidv4().slice(0, 8);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const enrollTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const priority = course_priority || course.priority || 0;

  const tempWaitlist = {
    enroll_time: enrollTime,
    course_priority: priority,
    coupon_expire_date: couponExpire,
  };
  const sortScore = calculateWaitlistSortScore(tempWaitlist);

  db.run(`INSERT INTO waitlists (id, trial_id, lead_id, student_name, course_id, course_name, campus_id, campus_name, coupon_id, coupon_code, discount_amount, course_priority, enroll_time, coupon_expire_date, operator, consultant, status, position, sort_score, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', 0, ?, ?, ?)`, 
    [id, trial_id || null, lead_id || null, student_name, course_id, course.name,
     campus_id || course.campus_id, campus_name || course.campus_name,
     coupon_id || null, coupon_code || '', discount_amount || 0,
     priority, enrollTime, couponExpire,
     operator || 'system', consultant || '',
     sortScore, now, now]);

  updateWaitlistPositions(course_id);

  if (lead_id) {
    db.run(`UPDATE leads SET status = 'waitlisted', updated_at = ? WHERE id = ?`, [now, lead_id]);
  }

  addAuditLog('create', 'waitlist', id, student_name, operator || 'system', 'admin', null, { course: course.name });
  persist();
  
  const updated = queryOne(`SELECT * FROM waitlists WHERE id = ?`, [id]);
  res.json({ id, position: updated.position, sort_score: updated.sort_score, message: '已加入候补列表' });
});

app.post('/api/waitlists/:id/convert', (req, res) => {
  const { operator } = req.body;
  const waitlist = queryOne(`SELECT * FROM waitlists WHERE id = ? AND status = 'waiting'`, [req.params.id]);
  if (!waitlist) {
    return res.status(404).json({ error: '候补记录不存在或已处理' });
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = ?`, [waitlist.course_id]);
  if (!course) {
    return res.status(400).json({ error: '课程不存在' });
  }
  if (course.enrolled >= course.capacity) {
    return res.status(400).json({ error: '课程仍满班，无法转正' });
  }

  const today = dayjs().format('YYYY-MM-DD');
  if (waitlist.coupon_expire_date && waitlist.coupon_expire_date < today) {
    return res.status(400).json({ error: '候补关联的优惠券已过期，需重新确认优惠' });
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const enrollId = 'e' + uuidv4().slice(0, 8);
  const origFee = course.fee || 0;
  const finFee = Math.max(0, origFee - (waitlist.discount_amount || 0));

  db.run(`INSERT INTO enrollments (id, trial_id, lead_id, student_name, course_id, course_name, campus_id, campus_name, coupon_id, coupon_code, discount_amount, original_fee, final_fee, operator, consultant, sales_attribution, status, approval_status, contract_id, refund_rule_id, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enrolled', 'approved', NULL, 'rr001', ?, ?)`, 
    [enrollId, waitlist.trial_id, waitlist.lead_id, waitlist.student_name,
     waitlist.course_id, waitlist.course_name, waitlist.campus_id, waitlist.campus_name,
     waitlist.coupon_id, waitlist.coupon_code, waitlist.discount_amount,
     origFee, finFee, operator || waitlist.operator || 'system', waitlist.consultant || '',
     waitlist.consultant || '', now, now]);

  db.run(`UPDATE courses SET enrolled = enrolled + 1, status = CASE WHEN enrolled + 1 >= capacity THEN 'full' ELSE 'active' END WHERE id = ?`, [waitlist.course_id]);

  db.run(`UPDATE waitlists SET status = 'converted', updated_at = ? WHERE id = ?`, [now, req.params.id]);

  if (waitlist.coupon_id) {
    db.run(`UPDATE coupons SET used = 'yes', status = 'used' WHERE id = ?`, [waitlist.coupon_id]);
  }

  if (waitlist.lead_id) {
    db.run(`UPDATE leads SET status = 'enrolled', updated_at = ? WHERE id = ?`, [now, waitlist.lead_id]);
  }

  const contractNo = 'HT' + dayjs().format('YYYYMM') + String(Math.floor(Math.random() * 9000) + 1000);
  const contractId = 'ct' + uuidv4().slice(0, 6);
  db.run(`INSERT INTO contracts (id, contract_no, enrollment_id, student_name, course_id, course_name, original_amount, discount_amount, final_amount, status, sign_date, effective_date, expire_date, signed_by, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'signed', ?, ?, ?, ?, ?)`, 
    [contractId, contractNo, enrollId, waitlist.student_name, waitlist.course_id, waitlist.course_name,
     origFee, waitlist.discount_amount, finFee, now, now, 
     dayjs().add(365, 'day').format('YYYY-MM-DD'), operator || 'system', now]);

  db.run(`UPDATE enrollments SET contract_id = ? WHERE id = ?`, [contractId, enrollId]);

  updateWaitlistPositions(waitlist.course_id);

  addAuditLog('convert', 'waitlist', req.params.id, waitlist.student_name, operator || 'system', 'admin', { status: 'waiting' }, { status: 'converted' });
  persist();
  res.json({ id: enrollId, contract_id: contractId, message: '候补转正成功' });
});

app.post('/api/waitlists/auto-convert', (req, res) => {
  const { course_id, operator } = req.body;
  const course = queryOne(`SELECT * FROM courses WHERE id = ?`, [course_id || '']);
  if (!course) {
    return res.status(400).json({ error: '课程不存在' });
  }

  const availableSpots = course.capacity - course.enrolled;
  if (availableSpots <= 0) {
    return res.json({ converted: 0, message: '课程暂无空位' });
  }

  updateWaitlistPositions(course_id);
  
  const waitlists = queryAll(
    `SELECT * FROM waitlists WHERE course_id = ? AND status = 'waiting' ORDER BY sort_score DESC, created_at ASC LIMIT ?`,
    [course_id, availableSpots]
  );

  const converted = [];
  const today = dayjs().format('YYYY-MM-DD');

  for (const w of waitlists) {
    if (w.coupon_expire_date && w.coupon_expire_date < today) {
      continue;
    }
    
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const enrollId = 'e' + uuidv4().slice(0, 8);
    const origFee = course.fee || 0;
    const finFee = Math.max(0, origFee - (w.discount_amount || 0));

    db.run(`INSERT INTO enrollments (id, trial_id, lead_id, student_name, course_id, course_name, campus_id, campus_name, coupon_id, coupon_code, discount_amount, original_fee, final_fee, operator, consultant, sales_attribution, status, approval_status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enrolled', 'approved', ?, ?)`, 
      [enrollId, w.trial_id, w.lead_id, w.student_name, w.course_id, w.course_name,
       w.campus_id, w.campus_name, w.coupon_id, w.coupon_code, w.discount_amount,
       origFee, finFee, operator || 'system', w.consultant || '', w.consultant || '',
       now, now]);

    db.run(`UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?`, [course_id]);
    db.run(`UPDATE waitlists SET status = 'converted', updated_at = ? WHERE id = ?`, [now, w.id]);

    if (w.coupon_id) {
      db.run(`UPDATE coupons SET used = 'yes', status = 'used' WHERE id = ?`, [w.coupon_id]);
    }
    if (w.lead_id) {
      db.run(`UPDATE leads SET status = 'enrolled', updated_at = ? WHERE id = ?`, [now, w.lead_id]);
    }
    
    converted.push({ id: enrollId, student_name: w.student_name, waitlist_id: w.id });
  }

  updateWaitlistPositions(course_id);
  persist();
  res.json({ converted: converted.length, details: converted, message: `自动转正 ${converted.length} 人` });
});

app.get('/api/contracts', (req, res) => {
  const { status, student_name } = req.query;
  let sql = "SELECT * FROM contracts WHERE 1=1";
  if (status) sql += ` AND status = '${status}'`;
  if (student_name) sql += ` AND student_name LIKE '%${student_name}%'`;
  sql += " ORDER BY created_at DESC";
  const contracts = queryAll(sql);
  res.json(contracts);
});

app.get('/api/audit-logs', (req, res) => {
  const { module, object_id, operator } = req.query;
  let sql = "SELECT * FROM audit_logs WHERE 1=1";
  if (module) sql += ` AND module = '${module}'`;
  if (object_id) sql += ` AND object_id = '${object_id}'`;
  if (operator) sql += ` AND operator LIKE '%${operator}%'`;
  sql += " ORDER BY created_at DESC LIMIT 100";
  const logs = queryAll(sql);
  res.json(logs);
});

app.get('/api/sales-attribution', (req, res) => {
  const stats = queryAll(`
    SELECT consultant as name, 
           COUNT(*) as lead_count,
           SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as enroll_count,
           (SELECT COUNT(*) FROM leads l2 WHERE l2.consultant = l.consultant) as total_leads
    FROM leads l 
    WHERE consultant IS NOT NULL 
    GROUP BY consultant 
    ORDER BY enroll_count DESC
  `);
  
  const enrollStats = queryAll(`
    SELECT sales_attribution as name,
           COUNT(*) as enroll_count,
           SUM(final_fee) as total_amount
    FROM enrollments
    WHERE sales_attribution IS NOT NULL AND status = 'enrolled'
    GROUP BY sales_attribution
    ORDER BY total_amount DESC
  `);
  
  res.json({ by_consultant: stats, by_sales: enrollStats });
});

const PORT = 3003;
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
    console.log('📚 API列表：');
    console.log('   GET  /api/health - 健康检查');
    console.log('   GET  /api/campuses - 校区列表');
    console.log('   GET  /api/course-packages - 课程包列表');
    console.log('   GET  /api/teachers - 老师列表');
    console.log('   GET  /api/teacher-schedules - 老师排课');
    console.log('   GET  /api/teacher-leaves - 老师请假');
    console.log('   GET  /api/lead-sources - 线索来源');
    console.log('   GET  /api/dashboard/stats - 统计数据');
    console.log('   GET  /api/dashboard/funnel - 转正漏斗数据');
    console.log('   GET  /api/courses - 课程列表');
    console.log('   GET  /api/leads - 线索列表');
    console.log('   GET  /api/leads/:id - 线索详情（含版本、联系人、跟进、试听）');
    console.log('   POST /api/leads - 新增线索');
    console.log('   PUT  /api/leads/:id - 更新线索（含版本记录）');
    console.log('   GET  /api/trials - 试听列表');
    console.log('   POST /api/trials - 安排试听（含重复预约和老师请假校验）');
    console.log('   PUT  /api/trials/:id/visit - 更新到访状态');
    console.log('   GET  /api/feedbacks - 反馈列表');
    console.log('   POST /api/feedbacks - 提交反馈（多维度评分）');
    console.log('   GET  /api/coupons - 优惠券列表');
    console.log('   POST /api/coupons/check - 校验单张优惠券');
    console.log('   POST /api/coupons/check-stack - 校验优惠券叠加');
    console.log('   GET  /api/enrollments - 报名列表');
    console.log('   POST /api/enrollments/check - 报名资格检查（含所有规则）');
    console.log('   POST /api/enrollments - 正式报名（含合同生成）');
    console.log('   GET  /api/waitlists - 候补列表');
    console.log('   POST /api/waitlists - 加入候补');
    console.log('   POST /api/waitlists/:id/convert - 候补转正');
    console.log('   POST /api/waitlists/auto-convert - 自动批量转正');
    console.log('   GET  /api/contracts - 合同列表');
    console.log('   GET  /api/rule-explanations - 规则解释');
    console.log('   GET  /api/refund-rules - 退费规则');
    console.log('   GET  /api/audit-logs - 操作审计日志');
    console.log('   GET  /api/sales-attribution - 销售归因统计');
  });
});
