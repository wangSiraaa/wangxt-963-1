const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const DB_PATH = path.join(__dirname, 'data', 'test.db');
let db = null;

async function test() {
  console.log('开始测试...');
  
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  
  db = new SQL.Database();
  console.log('数据库创建成功');
  
  try {
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
    console.log('✓ campuses 表创建成功');
    
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    db.run(`INSERT INTO campuses VALUES (?, ?, ?, ?, 'active', ?)`, 
      ['camp001', '朝阳校区', '北京市朝阳区', '010-88881111', now]);
    console.log('✓ 插入测试数据成功');
    
    const result = db.exec("SELECT * FROM campuses");
    console.log('✓ 查询结果:', result[0].values);
    
    console.log('\n✅ 基础测试通过');
    
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
    console.error(e.stack);
  }
}

test().catch(e => {
  console.error('严重错误:', e);
  process.exit(1);
});
