// AI 宝贝 v2.0 - 数据库初始化
const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'ai-baby.db');
const db = new sqlite3(DB_PATH);

db.serialize(() => {
  // Users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(11) UNIQUE NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    baby_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Babies
  db.run(`CREATE TABLE IF NOT EXISTS babies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(10),
    birthday DATE,
    avatar VARCHAR(255),
    favorite VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Games
  db.run(`CREATE TABLE IF NOT EXISTS games (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // QA
  db.run(`CREATE TABLE IF NOT EXISTS qa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50),
    tags VARCHAR(200),
    view_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Recommendations
  db.run(`CREATE TABLE IF NOT EXISTS recommendations (
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

  // Admin
  db.run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Admin data
  const adminPass = bcrypt.hashSync('admin123', 10);
  db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['admin', adminPass]);

  // Sample games
  db.run(`INSERT INTO games (title, icon, description, category, age_range, rating, thumbnail, is_featured) VALUES 
    ('幼儿拼图', '🧩', '拼图游戏，锻炼动手能力', '益智', '2-4岁', 4.8, '', 1),
    ('颜色认知', '🎨', '认识颜色和形状', '启蒙', '2-3岁', 4.5, '', 1),
    ('数字游戏', '🔢', '认识数字，简单加减', '数学', '3-5岁', 4.7, '', 0)`);

  // Sample QA
  db.run(`INSERT INTO qa (question, answer, category, tags) VALUES 
    ('宝宝不爱吃饭怎么办？', '建议：1.不要强迫 2.让孩子参与 3.固定用餐时间 4.做好榜样', '喂养', '挑食,吃饭'),
    ('宝宝多大可以上幼儿园？', '3-4岁是比较合适的入园年龄', '教育', '入园,幼儿园')`);

  console.log('✅ 数据库初始化完成！');
});

db.close();
