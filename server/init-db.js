// AI 宝贝 v2.0 - 数据库初始化 (better-sqlite3)
const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'ai-baby.db');
const db = new sqlite3(DB_PATH);

// 启用 WAL 模式和外键
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Users 表 (增加 password_hash 字段)
db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(11) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    baby_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Babies 表
db.exec(`CREATE TABLE IF NOT EXISTS babies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(10),
    birthday DATE,
    avatar VARCHAR(255),
    favorite VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

// Games 表
db.exec(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(20),
    age_range VARCHAR(20),
    download_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 4.5,
    thumbnail VARCHAR(255),
    content TEXT,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// QA 表
db.exec(`CREATE TABLE IF NOT EXISTS qa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50),
    tags VARCHAR(200),
    view_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Recommendations 表
db.exec(`CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    thumbnail VARCHAR(255),
    link VARCHAR(255),
    order_num INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Admin 表
db.exec(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Verifications 表 (保留用于验证码)
db.exec(`CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(11) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 索引
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_babies_user_id ON babies(user_id);
    CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);
    CREATE INDEX IF NOT EXISTS idx_qa_category ON qa(category);
    CREATE INDEX IF NOT EXISTS idx_recommendations_category ON recommendations(category);
`);

// 检查是否已有管理员
const admin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
if (!admin) {
    const adminPass = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', adminPass);
    console.log('  ✅ 默认管理员已创建: admin / admin123');
}

// 检查是否已有示例数据
const gameCount = db.prepare('SELECT COUNT(*) as c FROM games').get().c;
if (gameCount === 0) {
    const insertGames = db.prepare('INSERT INTO games (title, icon, description, category, age_range, rating, thumbnail, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertGames.run('幼儿拼图', '🧩', '拼图游戏，锻炼动手能力和空间想象力', '益智', '2-4岁', 4.8, '', 1);
    insertGames.run('颜色认知', '🎨', '认识颜色和形状，培养审美能力', '启蒙', '2-3岁', 4.5, '', 1);
    insertGames.run('数字游戏', '🔢', '认识数字，简单加减法启蒙', '数学', '3-5岁', 4.7, '', 0);
    insertGames.run('音乐节奏', '🎵', '跟着音乐打节拍，培养节奏感', '音乐', '2-5岁', 4.3, '', 0);
    insertGames.run('运动达人', '🏃', '认识运动项目，锻炼协调能力', '运动', '3-6岁', 4.6, '', 1);
    console.log('  ✅ 示例游戏数据已创建');
}

const qaCount = db.prepare('SELECT COUNT(*) as c FROM qa').get().c;
if (qaCount === 0) {
    const insertQA = db.prepare('INSERT INTO qa (question, answer, category, tags) VALUES (?, ?, ?, ?)');
    insertQA.run('宝宝不爱吃饭怎么办？', '建议：1.不要强迫进食 2.让孩子参与做饭过程 3.固定用餐时间 4.家长做好榜样 5.让食物变有趣，切成可爱形状。如果持续一个月以上体重不增，建议看儿科。', '喂养', '挑食,吃饭,厌食');
    insertQA.run('宝宝多大可以上幼儿园？', '3-4岁是比较合适的入园年龄。建议：提前半年开始做准备，带孩子熟悉幼儿园环境，培养基本自理能力（吃饭、如厕、穿脱衣服），学会表达需求。可以从半天托班开始，逐渐适应。', '教育', '入园,幼儿园,学前');
    insertQA.run('孩子经常发脾气怎么办？', '孩子发脾气是情绪表达还在发展中的正常表现。当下：先接纳情绪，保持冷静，等孩子平静后再说。预防：识别触发点，提前预告，教情绪词汇。4岁以上仍频繁激烈发脾气建议咨询专业人士。', '行为', '发脾气,哭闹,情绪');
    insertQA.run('如何培养孩子的阅读习惯？', '3-4岁：每天15分钟亲子共读，图多字少的绘本。4-5岁：延长到20分钟，读后讨论。5-6岁：20-30分钟，开始自主阅读。关键：固定时间、让孩子自己选书、家长做榜样。', '教育', '阅读,绘本,学习');
    insertQA.run('宝宝睡眠不好怎么办？', '各年龄段推荐睡眠：3-5岁10-13小时，5-6岁10-12小时。建议：固定作息时间、建立睡前仪式（洗澡→故事→晚安）、睡前1小时避免屏幕、白天充分活动。', '睡眠', '睡觉,晚睡,作息');
    console.log('  ✅ 示例问答数据已创建');
}

const recCount = db.prepare('SELECT COUNT(*) as c FROM recommendations').get().c;
if (recCount === 0) {
    const insertRec = db.prepare('INSERT INTO recommendations (title, content, category, thumbnail, link, is_featured, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertRec.run('如何培养5-6岁孩子的阅读习惯', '1. 每天固定15-20分钟亲子阅读时间\n2. 让孩子自己选书，尊重兴趣\n3. 读完后和孩子讨论故事内容\n4. 家长以身作则，自己也多看书', '育儿知识', '', '', 1, 0);
    insertRec.run('幼小衔接家长必看指南', '从学习能力、生活自理、社交能力、心理准备四个方面做好幼小衔接。关键是让孩子对上学充满期待。', '育儿知识', '', '', 1, 1);
    insertRec.run('精选绘本推荐', '《猜猜我有多爱你》《好饿的毛毛虫》《大卫不可以》《我爸爸》《逃家小兔》——这些经典绘本值得每个孩子拥有。', '绘本', '', '', 1, 2);
    console.log('  ✅ 示例推荐数据已创建');
}

console.log('✅ 数据库初始化完成！');

module.exports = db;
