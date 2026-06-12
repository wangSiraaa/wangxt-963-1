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
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      teacher TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      enrolled INTEGER DEFAULT 0,
      schedule TEXT,
      status TEXT DEFAULT 'active'
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
      consultant TEXT,
      status TEXT DEFAULT 'new',
      course_id TEXT,
      remark TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trials (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_name TEXT,
      trial_date TEXT NOT NULL,
      visited TEXT DEFAULT 'no',
      visit_status TEXT DEFAULT 'pending',
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
      teacher TEXT NOT NULL,
      rating INTEGER,
      content TEXT,
      suggestion TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT DEFAULT 'fixed',
      min_amount REAL DEFAULT 0,
      student_name TEXT,
      expire_date TEXT NOT NULL,
      used TEXT DEFAULT 'no',
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      trial_id TEXT,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_name TEXT,
      coupon_id TEXT,
      coupon_code TEXT,
      discount_amount REAL DEFAULT 0,
      original_fee REAL,
      final_fee REAL,
      operator TEXT,
      status TEXT DEFAULT 'enrolled',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS waitlists (
      id TEXT PRIMARY KEY,
      trial_id TEXT,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_name TEXT,
      coupon_id TEXT,
      coupon_code TEXT,
      discount_amount REAL DEFAULT 0,
      operator TEXT,
      status TEXT DEFAULT 'waiting',
      position INTEGER,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  console.log('📋 数据库表创建完成');
}

function seedData() {
  const count = db.exec("SELECT COUNT(*) as cnt FROM courses");
  if (count[0] && count[0].values[0][0] > 0) {
    console.log('已有初始数据，跳过种子数据');
    return;
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const futureDate = dayjs().add(30, 'day').format('YYYY-MM-DD');
  const pastDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const courses = [
    { id: 'c001', name: '少儿英语启蒙班', teacher: '王老师', capacity: 8, enrolled: 8, schedule: '周六 09:00-10:30', status: 'full' },
    { id: 'c002', name: '数学思维提升班', teacher: '李老师', capacity: 10, enrolled: 6, schedule: '周日 14:00-15:30', status: 'active' },
    { id: 'c003', name: '创意美术班', teacher: '张老师', capacity: 12, enrolled: 12, schedule: '周六 14:00-16:00', status: 'full' },
    { id: 'c004', name: '编程启蒙班', teacher: '陈老师', capacity: 10, enrolled: 3, schedule: '周日 09:00-10:30', status: 'active' },
    { id: 'c005', name: '钢琴一对一', teacher: '赵老师', capacity: 1, enrolled: 1, schedule: '预约制', status: 'full' },
  ];

  courses.forEach(c => {
    db.run(`INSERT INTO courses VALUES ('${c.id}','${c.name}','${c.teacher}',${c.capacity},${c.enrolled},'${c.schedule}','${c.status}')`);
  });

  const leads = [
    { id: 'l001', name: '小明', parent: '王建国', phone: '13800001111', age: 7, source: '线上推广', consultant: '刘顾问', status: 'trial_scheduled', course_id: 'c001' },
    { id: 'l002', name: '小红', parent: '李丽', phone: '13800002222', age: 8, source: '转介绍', consultant: '刘顾问', status: 'visited', course_id: 'c002' },
    { id: 'l003', name: '小刚', parent: '张伟', phone: '13800003333', age: 6, source: '地推活动', consultant: '陈顾问', status: 'no_show', course_id: 'c004' },
    { id: 'l004', name: '小美', parent: '赵芳', phone: '13800004444', age: 9, source: '线上推广', consultant: '陈顾问', status: 'visited', course_id: 'c003' },
    { id: 'l005', name: '小华', parent: '孙磊', phone: '13800005555', age: 7, source: '老学员推荐', consultant: '刘顾问', status: 'enrolled', course_id: 'c002' },
    { id: 'l006', name: '小强', parent: '周明', phone: '13800006666', age: 8, source: '转介绍', consultant: '陈顾问', status: 'visited', course_id: 'c001' },
  ];

  leads.forEach(l => {
    db.run(`INSERT INTO leads VALUES ('${l.id}','${l.name}','${l.parent}','${l.phone}',${l.age},'${l.source}','${l.consultant}','${l.status}',${l.course_id ? "'" + l.course_id + "'" : 'NULL'},'','${now}','${now}')`);
  });

  const trials = [
    { id: 't001', lead_id: 'l001', name: '小明', course_id: 'c001', course_name: '少儿英语启蒙班', date: dayjs().add(2, 'day').format('YYYY-MM-DD'), visited: 'no', visit_status: 'pending', consultant: '刘顾问' },
    { id: 't002', lead_id: 'l002', name: '小红', course_id: 'c002', course_name: '数学思维提升班', date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), visited: 'yes', visit_status: 'visited', consultant: '刘顾问' },
    { id: 't003', lead_id: 'l003', name: '小刚', course_id: 'c004', course_name: '编程启蒙班', date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), visited: 'no', visit_status: 'no_show', consultant: '陈顾问' },
    { id: 't004', lead_id: 'l004', name: '小美', course_id: 'c003', course_name: '创意美术班', date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), visited: 'yes', visit_status: 'visited', consultant: '陈顾问' },
    { id: 't005', lead_id: 'l006', name: '小强', course_id: 'c001', course_name: '少儿英语启蒙班', date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), visited: 'yes', visit_status: 'visited', consultant: '陈顾问' },
  ];

  trials.forEach(t => {
    db.run(`INSERT INTO trials VALUES ('${t.id}','${t.lead_id}','${t.name}','${t.course_id}','${t.course_name}','${t.date}','${t.visited}','${t.visit_status}','${t.consultant}','${now}','${now}')`);
  });

  const feedbacks = [
    { id: 'f001', trial_id: 't002', name: '小红', course_name: '数学思维提升班', teacher: '李老师', rating: 5, content: '学生反应快，逻辑思维能力强，建议正式入学', suggestion: '可进入中级班学习' },
    { id: 'f002', trial_id: 't004', name: '小美', course_name: '创意美术班', teacher: '张老师', rating: 4, content: '学生对色彩敏感度高，有绘画天赋，课堂表现积极', suggestion: '建议报名后加强素描基础训练' },
    { id: 'f003', trial_id: 't005', name: '小强', course_name: '少儿英语启蒙班', teacher: '王老师', rating: 5, content: '英语基础扎实，口语表达流利，能快速适应课堂节奏', suggestion: '适合进阶班学习' },
  ];

  feedbacks.forEach(f => {
    db.run(`INSERT INTO feedbacks VALUES ('${f.id}','${f.trial_id}','${f.name}','${f.course_name}','${f.teacher}',${f.rating},'${f.content}','${f.suggestion}','${now}')`);
  });

  const coupons = [
    { id: 'cp001', code: 'NEW2024', amount: 200, type: 'fixed', min_amount: 1000, student_name: null, expire_date: futureDate, used: 'no', status: 'active' },
    { id: 'cp002', code: 'VIP500', amount: 500, type: 'fixed', min_amount: 2000, student_name: null, expire_date: futureDate, used: 'no', status: 'active' },
    { id: 'cp003', code: 'EXPIRED100', amount: 100, type: 'fixed', min_amount: 500, student_name: null, expire_date: pastDate, used: 'no', status: 'expired' },
    { id: 'cp004', code: 'SUMMER300', amount: 300, type: 'fixed', min_amount: 1500, student_name: '小红', expire_date: futureDate, used: 'no', status: 'active' },
  ];

  coupons.forEach(c => {
    db.run(`INSERT INTO coupons VALUES ('${c.id}','${c.code}',${c.amount},'${c.type}',${c.min_amount},${c.student_name ? "'" + c.student_name + "'" : 'NULL'},'${c.expire_date}','${c.used}','${c.status}','${now}')`);
  });

  const enrollments = [
    { id: 'e001', trial_id: 't002', name: '小红', course_id: 'c002', course_name: '数学思维提升班', coupon_id: 'cp004', coupon_code: 'SUMMER300', discount_amount: 300, original_fee: 3000, final_fee: 2700, operator: '教务张老师', status: 'enrolled' },
  ];

  enrollments.forEach(e => {
    db.run(`INSERT INTO enrollments VALUES ('${e.id}',${e.trial_id ? "'" + e.trial_id + "'" : 'NULL'},'${e.name}','${e.course_id}','${e.course_name}',${e.coupon_id ? "'" + e.coupon_id + "'" : 'NULL'},${e.coupon_code ? "'" + e.coupon_code + "'" : 'NULL'},${e.discount_amount},${e.original_fee},${e.final_fee},'${e.operator}','${e.status}','${now}')`);
  });

  console.log('🌱 种子数据已插入');
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

// ============ API Routes ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: dayjs().format('YYYY-MM-DD HH:mm:ss') });
});

app.get('/api/dashboard/stats', (req, res) => {
  const leads = queryOne("SELECT COUNT(*) as cnt FROM leads")?.cnt || 0;
  const trials = queryOne("SELECT COUNT(*) as cnt FROM trials")?.cnt || 0;
  const visited = queryOne("SELECT COUNT(*) as cnt FROM trials WHERE visited = 'yes'")?.cnt || 0;
  const enrollments = queryOne("SELECT COUNT(*) as cnt FROM enrollments")?.cnt || 0;
  const waitlists = queryOne("SELECT COUNT(*) as cnt FROM waitlists WHERE status = 'waiting'")?.cnt || 0;
  const feedbacks = queryOne("SELECT COUNT(*) as cnt FROM feedbacks")?.cnt || 0;

  const recentLeads = queryAll("SELECT * FROM leads ORDER BY created_at DESC LIMIT 5");
  const recentTrials = queryAll("SELECT * FROM trials ORDER BY created_at DESC LIMIT 5");

  res.json({
    leads,
    trials,
    visited,
    enrollments,
    waitlists,
    feedbacks,
    conversionRate: leads > 0 ? ((enrollments / leads) * 100).toFixed(1) : '0',
    visitRate: trials > 0 ? ((visited / trials) * 100).toFixed(1) : '0',
    recentLeads,
    recentTrials,
  });
});

app.get('/api/courses', (req, res) => {
  const courses = queryAll("SELECT * FROM courses ORDER BY id");
  res.json(courses);
});

app.get('/api/leads', (req, res) => {
  const leads = queryAll("SELECT * FROM leads ORDER BY created_at DESC");
  res.json(leads);
});

app.post('/api/leads', (req, res) => {
  const { student_name, parent_name, phone, age, source, consultant, course_id, remark } = req.body;
  if (!student_name || !phone) {
    return res.status(400).json({ error: '学员姓名和联系电话必填' });
  }
  const id = 'l' + uuidv4().slice(0, 6);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  db.run(`INSERT INTO leads VALUES ('${id}','${student_name}',${parent_name ? "'" + parent_name + "'" : 'NULL'},'${phone}',${age || 'NULL'},${source ? "'" + source + "'" : 'NULL'},${consultant ? "'" + consultant + "'" : 'NULL'},'new',${course_id ? "'" + course_id + "'" : 'NULL'},${remark ? "'" + remark + "'" : "''"},'${now}','${now}')`);
  persist();
  res.json({ id, message: '线索创建成功' });
});

app.put('/api/leads/:id', (req, res) => {
  const { status } = req.body;
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  db.run(`UPDATE leads SET status = '${status}', updated_at = '${now}' WHERE id = '${req.params.id}'`);
  persist();
  res.json({ message: '线索状态已更新' });
});

app.get('/api/trials', (req, res) => {
  const trials = queryAll("SELECT * FROM trials ORDER BY trial_date DESC");
  res.json(trials);
});

app.post('/api/trials', (req, res) => {
  const { lead_id, student_name, course_id, trial_date, consultant } = req.body;
  if (!lead_id || !course_id || !trial_date) {
    return res.status(400).json({ error: '线索、课程和试听日期必填' });
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = '${course_id}'`);
  if (!course) {
    return res.status(400).json({ error: '课程不存在' });
  }

  const id = 't' + uuidv4().slice(0, 6);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.run(`INSERT INTO trials VALUES ('${id}','${lead_id}','${student_name}','${course_id}','${course.name}','${trial_date}','no','pending',${consultant ? "'" + consultant + "'" : 'NULL'},'${now}','${now}')`);
  db.run(`UPDATE leads SET status = 'trial_scheduled', updated_at = '${now}' WHERE id = '${lead_id}'`);
  persist();
  res.json({ id, message: '试听安排成功' });
});

app.put('/api/trials/:id/visit', (req, res) => {
  const { visited, visit_status } = req.body;
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const trial = queryOne(`SELECT * FROM trials WHERE id = '${req.params.id}'`);
  if (!trial) {
    return res.status(404).json({ error: '试听记录不存在' });
  }

  db.run(`UPDATE trials SET visited = '${visited}', visit_status = '${visit_status}', updated_at = '${now}' WHERE id = '${req.params.id}'`);

  if (visited === 'yes') {
    db.run(`UPDATE leads SET status = 'visited', updated_at = '${now}' WHERE id = '${trial.lead_id}'`);
  } else if (visit_status === 'no_show') {
    db.run(`UPDATE leads SET status = 'no_show', updated_at = '${now}' WHERE id = '${trial.lead_id}'`);
  }

  persist();
  res.json({ message: '到访状态已更新' });
});

app.get('/api/feedbacks', (req, res) => {
  const feedbacks = queryAll("SELECT * FROM feedbacks ORDER BY created_at DESC");
  res.json(feedbacks);
});

app.post('/api/feedbacks', (req, res) => {
  const { trial_id, student_name, course_name, teacher, rating, content, suggestion } = req.body;
  if (!trial_id || !teacher) {
    return res.status(400).json({ error: '试听记录和老师必填' });
  }

  const id = 'f' + uuidv4().slice(0, 6);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.run(`INSERT INTO feedbacks VALUES ('${id}','${trial_id}','${student_name}',${course_name ? "'" + course_name + "'" : 'NULL'},'${teacher}',${rating || 'NULL'},${content ? "'" + content + "'" : 'NULL'},${suggestion ? "'" + suggestion + "'" : 'NULL'},'${now}')`);
  persist();
  res.json({ id, message: '反馈提交成功' });
});

app.get('/api/coupons', (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  db.run(`UPDATE coupons SET status = 'expired' WHERE expire_date < '${today}' AND status = 'active'`);
  persist();
  const coupons = queryAll("SELECT * FROM coupons ORDER BY created_at DESC");
  res.json(coupons);
});

app.post('/api/coupons/check', (req, res) => {
  const { code, course_id } = req.body;
  if (!code) {
    return res.status(400).json({ error: '请输入优惠券码' });
  }
  const today = dayjs().format('YYYY-MM-DD');
  const coupon = queryOne(`SELECT * FROM coupons WHERE code = '${code}' AND used = 'no'`);
  if (!coupon) {
    return res.json({ valid: false, reason: '优惠券不存在或已使用' });
  }
  if (coupon.expire_date < today) {
    return res.json({ valid: false, reason: '优惠券已过期，不能抵扣', coupon });
  }
  const course = queryOne(`SELECT * FROM courses WHERE id = '${course_id}'`);
  if (course && coupon.min_amount > 0) {
    const fee = 3000;
    if (fee < coupon.min_amount) {
      return res.json({ valid: false, reason: `未满${coupon.min_amount}元，不可使用该券`, coupon });
    }
  }
  res.json({ valid: true, coupon });
});

app.get('/api/enrollments', (req, res) => {
  const enrollments = queryAll("SELECT * FROM enrollments ORDER BY created_at DESC");
  res.json(enrollments);
});

app.post('/api/enrollments/check', (req, res) => {
  const { trial_id, course_id } = req.body;
  const errors = [];
  const warnings = [];

  const trial = queryOne(`SELECT * FROM trials WHERE id = '${trial_id}'`);
  if (!trial) {
    errors.push('试听记录不存在');
    return res.json({ can_enroll: false, errors, warnings });
  }

  if (trial.visited !== 'yes') {
    errors.push('试听未到访，不能办理转正报名');
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = '${course_id}'`);
  if (!course) {
    errors.push('课程不存在');
  } else if (course.enrolled >= course.capacity) {
    warnings.push(`课程「${course.name}」已满班(${course.enrolled}/${course.capacity})，只能进入候补`);
  }

  const existingEnroll = queryOne(`SELECT * FROM enrollments WHERE trial_id = '${trial_id}' AND status = 'enrolled'`);
  if (existingEnroll) {
    errors.push('该学员已报名，不可重复报名');
  }

  res.json({
    can_enroll: errors.length === 0,
    is_waitlist: warnings.length > 0 && errors.length === 0,
    errors,
    warnings,
    trial,
    course,
  });
});

app.post('/api/enrollments', (req, res) => {
  const { trial_id, student_name, course_id, coupon_id, coupon_code, discount_amount, original_fee, final_fee, operator } = req.body;

  const check = queryOne(`SELECT visited FROM trials WHERE id = '${trial_id}'`);
  if (!check || check.visited !== 'yes') {
    return res.status(400).json({ error: '试听未到访，不能办理转正报名' });
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = '${course_id}'`);
  if (course && course.enrolled >= course.capacity) {
    return res.status(400).json({ error: '课程已满班，请加入候补' });
  }

  const id = 'e' + uuidv4().slice(0, 6);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.run(`INSERT INTO enrollments VALUES ('${id}','${trial_id}','${student_name}','${course_id}','${course?.name || ''}',${coupon_id ? "'" + coupon_id + "'" : 'NULL'},${coupon_code ? "'" + coupon_code + "'" : 'NULL'},${discount_amount || 0},${original_fee},${final_fee},'${operator}','enrolled','${now}')`);

  if (course) {
    db.run(`UPDATE courses SET enrolled = enrolled + 1, status = CASE WHEN enrolled + 1 >= capacity THEN 'full' ELSE 'active' END WHERE id = '${course_id}'`);
  }

  if (coupon_id) {
    db.run(`UPDATE coupons SET used = 'yes', status = 'used' WHERE id = '${coupon_id}'`);
  }

  const trialInfo = queryOne(`SELECT lead_id FROM trials WHERE id = '${trial_id}'`);
  if (trialInfo) {
    db.run(`UPDATE leads SET status = 'enrolled', updated_at = '${now}' WHERE id = '${trialInfo.lead_id}'`);
  }

  persist();
  res.json({ id, message: '报名成功' });
});

app.get('/api/waitlists', (req, res) => {
  const waitlists = queryAll("SELECT * FROM waitlists ORDER BY created_at DESC");
  res.json(waitlists);
});

app.post('/api/waitlists', (req, res) => {
  const { trial_id, student_name, course_id, coupon_id, coupon_code, discount_amount, operator } = req.body;

  const today = dayjs().format('YYYY-MM-DD');
  if (coupon_id) {
    const coupon = queryOne(`SELECT * FROM coupons WHERE id = '${coupon_id}'`);
    if (coupon && coupon.expire_date < today) {
      return res.status(400).json({ error: '优惠券已过期，不能抵扣' });
    }
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = '${course_id}'`);
  const courseName = course ? course.name : '';

  const maxPos = queryOne(`SELECT MAX(position) as max_pos FROM waitlists WHERE course_id = '${course_id}' AND status = 'waiting'`);
  const position = (maxPos?.max_pos || 0) + 1;

  const id = 'w' + uuidv4().slice(0, 6);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  db.run(`INSERT INTO waitlists VALUES ('${id}','${trial_id}','${student_name}','${course_id}','${courseName}',${coupon_id ? "'" + coupon_id + "'" : 'NULL'},${coupon_code ? "'" + coupon_code + "'" : 'NULL'},${discount_amount || 0},'${operator}','waiting',${position},'${now}','${now}')`);

  if (trial_id) {
    const trialInfo = queryOne(`SELECT lead_id FROM trials WHERE id = '${trial_id}'`);
    if (trialInfo) {
      db.run(`UPDATE leads SET status = 'waitlisted', updated_at = '${now}' WHERE id = '${trialInfo.lead_id}'`);
    }
  }

  persist();
  res.json({ id, position, message: '已加入候补列表' });
});

app.post('/api/waitlists/:id/convert', (req, res) => {
  const waitlist = queryOne(`SELECT * FROM waitlists WHERE id = '${req.params.id}' AND status = 'waiting'`);
  if (!waitlist) {
    return res.status(404).json({ error: '候补记录不存在或已处理' });
  }

  const course = queryOne(`SELECT * FROM courses WHERE id = '${waitlist.course_id}'`);
  if (!course) {
    return res.status(400).json({ error: '课程不存在' });
  }
  if (course.enrolled >= course.capacity) {
    return res.status(400).json({ error: '课程仍满班，无法转正' });
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const enrollId = 'e' + uuidv4().slice(0, 6);

  const original_fee = 3000;
  const final_fee = original_fee - (waitlist.discount_amount || 0);

  db.run(`INSERT INTO enrollments VALUES ('${enrollId}','${waitlist.trial_id}','${waitlist.student_name}','${waitlist.course_id}','${waitlist.course_name}',${waitlist.coupon_id ? "'" + waitlist.coupon_id + "'" : 'NULL'},${waitlist.coupon_code ? "'" + waitlist.coupon_code + "'" : 'NULL'},${waitlist.discount_amount || 0},${original_fee},${final_fee},'${waitlist.operator}','enrolled','${now}')`);

  db.run(`UPDATE courses SET enrolled = enrolled + 1, status = CASE WHEN enrolled + 1 >= capacity THEN 'full' ELSE 'active' END WHERE id = '${waitlist.course_id}'`);

  db.run(`UPDATE waitlists SET status = 'converted', updated_at = '${now}' WHERE id = '${req.params.id}'`);

  if (waitlist.coupon_id) {
    db.run(`UPDATE coupons SET used = 'yes', status = 'used' WHERE id = '${waitlist.coupon_id}'`);
  }

  if (waitlist.trial_id) {
    const trialInfo = queryOne(`SELECT lead_id FROM trials WHERE id = '${waitlist.trial_id}'`);
    if (trialInfo) {
      db.run(`UPDATE leads SET status = 'enrolled', updated_at = '${now}' WHERE id = '${trialInfo.lead_id}'`);
    }
  }

  persist();
  res.json({ id: enrollId, message: '候补转正成功' });
});

const PORT = 3003;
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
    console.log('📚 API列表：');
    console.log('   GET  /api/health - 健康检查');
    console.log('   GET  /api/dashboard/stats - 统计数据');
    console.log('   GET  /api/courses - 课程列表');
    console.log('   GET  /api/leads - 线索列表');
    console.log('   POST /api/leads - 新增线索');
    console.log('   GET  /api/trials - 试听列表');
    console.log('   POST /api/trials - 安排试听');
    console.log('   PUT  /api/trials/:id/visit - 更新到访状态');
    console.log('   GET  /api/feedbacks - 反馈列表');
    console.log('   POST /api/feedbacks - 提交反馈');
    console.log('   GET  /api/coupons - 优惠券列表');
    console.log('   GET  /api/enrollments - 报名列表');
    console.log('   POST /api/enrollments/check - 报名资格检查');
    console.log('   POST /api/enrollments - 正式报名');
    console.log('   GET  /api/waitlists - 候补列表');
    console.log('   POST /api/waitlists - 加入候补');
    console.log('   POST /api/waitlists/:id/convert - 候补转正');
  });
});
