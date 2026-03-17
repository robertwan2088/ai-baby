const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'client')));

const AI_URL = process.env.AI_API_URL || 'https://api.deepseek.com';
const AI_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

// ========== SQLite Database ==========
const initSQL = require('sql.js');
const DB_PATH = path.join(__dirname, '..', 'data', 'aibaby.db');
let db = null;

async function initDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    const SQL = await initSQL();
    db = new SQL.Database(buf);
  } else {
    const SQL = await initSQL();
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    token TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER DEFAULT 0,
    gender TEXT DEFAULT '男',
    avatar TEXT DEFAULT '👶',
    hobbies TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    theme TEXT DEFAULT '',
    content TEXT NOT NULL,
    child_name TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS growth_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    child_id TEXT DEFAULT '',
    type TEXT DEFAULT '日常',
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    emoji TEXT DEFAULT '📝',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, item_type, item_id)
  )`);

  saveDB();
  console.log('  📦 Database initialized');
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function uid() { return crypto.randomBytes(16).toString('hex'); }

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '请先登录' });
  const user = db.prepare('SELECT id, phone, nickname, avatar FROM users WHERE token = ?').get(token);
  if (!user) return res.status(401).json({ error: '登录已过期' });
  req.user = user;
  next();
}

// ========== Auth APIs ==========
app.post('/api/register', authMiddleware, (req, res) => {
  const { phone, nickname } = req.body;
  if (!phone) return res.status(400).json({ error: '请输入手机号' });
  try {
    db.run('INSERT INTO users (id, phone, nickname, token) VALUES (?, ?, ?, ?)',
      [req.user.id, phone, nickname || '宝妈' + phone.slice(-4), req.headers.authorization.replace('Bearer ', '')]);
    saveDB();
    res.json({ id: req.user.id, phone, nickname: nickname || '宝妈' + phone.slice(-4) });
  } catch (e) {
    res.status(400).json({ error: '该手机号已注册' });
  }
});

app.post('/api/login', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: '请输入手机号' });
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (user) {
    const token = uid();
    db.run('UPDATE users SET token = ?, updated_at = strftime("%s","now") WHERE id = ?', [token, user.id]);
    saveDB();
    res.json({ id: user.id, phone: user.phone, nickname: user.nickname, token });
  } else {
    // 自动注册
    const id = uid();
    const token = uid();
    const nickname = '宝妈' + phone.slice(-4);
    db.run('INSERT INTO users (id, phone, nickname, token) VALUES (?, ?, ?, ?)', [id, phone, nickname, token]);
    saveDB();
    res.json({ id, phone, nickname, token });
  }
});

app.get('/api/user/profile', authMiddleware, (req, res) => {
  const user = req.user;
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM books WHERE user_id = ?) as book_count,
      (SELECT COUNT(*) FROM chat_messages WHERE user_id = ? AND role = 'user') as chat_count,
      (SELECT COUNT(DISTINCT date(created_at, 'unixepoch')) FROM chat_messages WHERE user_id = ?) as active_days
  `).get(user.id, user.id, user.id);
  const children = db.prepare('SELECT * FROM children WHERE user_id = ?').all(user.id);
  res.json({ ...user, ...stats, children });
});

app.put('/api/user/profile', authMiddleware, (req, res) => {
  const { nickname, avatar } = req.body;
  if (nickname) db.run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user.id]);
  if (avatar) db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
  saveDB();
  res.json({ message: '更新成功' });
});

// ========== Children APIs ==========
app.post('/api/children', authMiddleware, (req, res) => {
  const { name, age, gender, hobbies } = req.body;
  if (!name) return res.status(400).json({ error: '请输入宝贝名字' });
  const id = uid();
  db.run('INSERT INTO children (id, user_id, name, age, gender, avatar, hobbies) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, name, age || 0, gender || '男', gender === '女' ? '👧' : '👦', hobbies || '']);
  saveDB();
  res.json({ id, name, age, gender });
});

app.put('/api/children/:id', authMiddleware, (req, res) => {
  const { name, age, gender, hobbies } = req.body;
  db.run('UPDATE children SET name=?, age=?, gender=?, hobbies=? WHERE id=? AND user_id=?',
    [name, age, gender, hobbies, req.params.id, req.user.id]);
  saveDB();
  res.json({ message: '更新成功' });
});

app.delete('/api/children/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM children WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  saveDB();
  res.json({ message: '删除成功' });
});

// ========== Chat APIs ==========
app.get('/api/chat/history', authMiddleware, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const messages = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(req.user.id, limit).reverse();
  res.json({ messages });
});

app.post('/api/chat', async (req, res) => {
  const { message, token } = req.body;
  if (!message) return res.status(400).json({ error: '请输入问题' });

  let userId = null;
  if (token) {
    const user = db.prepare('SELECT id FROM users WHERE token = ?').get(token);
    if (user) userId = user.id;
  }

  const aiReply = await callAI([
    { role: 'system', content: '你是一位专业的幼儿教育顾问，拥有10年以上的儿童教育和心理学经验。回答要求：语气温和耐心，给出2-3条具体建议，200-400字。先共情再给建议。' },
    { role: 'user', content: message }
  ]);

  if (aiReply && userId) {
    db.run('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)', [uid(), userId, 'user', message]);
    db.run('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)', [uid(), userId, 'ai', aiReply]);
    saveDB();
    return res.json({ reply: aiReply });
  }

  if (aiReply) return res.json({ reply: aiReply });

  // 模拟降级
  const low = message.toLowerCase();
  const QA = [
    { kw: ['吃饭','挑食'], a: '孩子挑食建议：\n1. 不要强迫进食\n2. 让孩子参与做饭\n3. 固定用餐时间\n4. 做好榜样\n5. 让食物变有趣' },
    { kw: ['发脾气','生气','情绪'], a: '孩子发脾气处理方法：\n1. 先接纳情绪，保持冷静\n2. 等孩子平静后再说\n3. 教情绪词汇\n4. 预防：识别触发点，提前预告' },
    { kw: ['阅读','绘本','看书'], a: '培养阅读习惯：\n3-4岁每天15分钟亲子共读\n4-5岁延长到20分钟\n5-6岁开始自主阅读\n关键：固定时间、让孩子选书、家长做榜样' },
    { kw: ['睡觉','睡眠'], a: '各年龄段推荐睡眠：3-5岁10-13小时，5-6岁10-12小时。建议固定作息、睡前仪式、避免屏幕。' },
  ];
  let reply = '建议：1.尊重孩子节奏 2.多观察少干预 3.保持耐心 4.以身作则。提供更多细节我可以给更针对性的建议。';
  for (const q of QA) { if (q.kw.some(k => low.includes(k))) { reply = q.a; break; } }
  res.json({ reply });
});

// ========== Books APIs ==========
app.get('/api/books', authMiddleware, (req, res) => {
  const books = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ books });
});

app.post('/api/books', authMiddleware, (req, res) => {
  const { title, theme, content, child_name } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const id = uid();
  db.run('INSERT INTO books (id, user_id, title, theme, content, child_name) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.id, title, theme || '', content, child_name || '']);
  saveDB();
  res.json({ id, title });
});

app.delete('/api/books/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM books WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  saveDB();
  res.json({ message: '删除成功' });
});

// ========== Growth Records APIs ==========
app.get('/api/growth', authMiddleware, (req, res) => {
  const records = db.prepare('SELECT * FROM growth_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ records });
});

app.post('/api/growth', authMiddleware, (req, res) => {
  const { child_id, type, title, content, emoji } = req.body;
  if (!title) return res.status(400).json({ error: '请输入记录标题' });
  const id = uid();
  db.run('INSERT INTO growth_records (id, user_id, child_id, type, title, content, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, child_id || '', type || '日常', title, content || '', emoji || '📝']);
  saveDB();
  res.json({ id, title });
});

// ========== Favorites APIs ==========
app.get('/api/favorites', authMiddleware, (req, res) => {
  const favs = db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ favorites: favs });
});

app.post('/api/favorites', authMiddleware, (req, res) => {
  const { item_type, item_id, title, content } = req.body;
  if (!item_type || !item_id) return res.status(400).json({ error: '参数错误' });
  const id = uid();
  try {
    db.run('INSERT INTO favorites (id, user_id, item_type, item_id, title, content) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, item_type, item_id, title || '', content || '']);
    saveDB();
    res.json({ id });
  } catch (e) {
    res.json({ message: '已收藏' });
  }
});

app.delete('/api/favorites/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM favorites WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  saveDB();
  res.json({ message: '已取消收藏' });
});

// ========== Story Generation API ==========
app.post('/api/story', async (req, res) => {
  const { name, age, gender, hobbies, theme } = req.body;
  if (!name || !theme) return res.status(400).json({ error: '请填写名字和主题' });

  const aiStory = await callAI([
    { role: 'system', content: '你是一位优秀的儿童绘本作家。为3-6岁儿童创作300-500字的故事。语言简单生动，融入孩子名字和喜好。结尾温暖。不要暴力恐怖内容。' },
    { role: 'user', content: `孩子：${name}，${age}岁，${gender}，爱好：${hobbies||'无'}，主题：${theme}。请创作专属故事。` }
  ]);

  if (aiStory) return res.json({ story: aiStory, title: name + '的' + theme + '故事' });

  const TPL = {
    '睡前故事': (n,a,g,h) => `从前，有一个叫${n}的小${g==='女'?'女孩':'男孩'}，今年${a}岁。\n\n每天晚上睡觉前，${n}最喜欢听妈妈讲故事。但今天，妈妈说："${n}，今晚想不想去星星的世界看看呀？"\n\n${n}的眼睛一下子亮了起来。就在这时，窗外飘进来一颗闪闪发光的小星星，轻轻落在了${n}的手心里。\n\n"跟我来吧，"小星星说。\n\n${n}牵着小星星的手，飞过了屋顶，飞过了云层，来到了满天繁星的夜空。星星们都出来欢迎${n}了，排成一排，轻轻地唱着歌。\n\n${n}在星星们的歌声中，慢慢地闭上了眼睛。星星们用最柔软的星光给${n}盖了一床暖暖的光毯。\n\n"晚安，${n}。"月亮婆婆温柔地说，"明天又是美好的一天。"\n\n${n}微笑着进入了甜甜的梦乡。🌙`,
    '冒险探索': (n,a,g,h) => `从前，有一个叫${n}的小${g==='女'?'女孩':'男孩'}，今年${a}岁。\n\n有一天，${n}在后院的大树下发现了一个闪闪发光的盒子。打开后跳出一个会说话的小指南针："你想不想去一个从未有人到过的地方？"\n\n于是${n}出发了。穿过唱歌的花田，踩着石头过了小溪，最后来到了山顶。\n\n山顶上有一棵美丽的"勇气之树"，树上结满了彩色的果实。\n\n"每颗果实都是一个小小的勇气，"小指南针说，"你今天的冒险，让这棵树又长出了新的果实。"\n\n${n}摘了一颗金色的果实放进口袋。回家的路上，${n}心里暖暖的——原来勇气就在自己心里。🌟`,
  };
  const tpl = TPL[theme] || TPL['冒险探索'];
  res.json({ story: tpl(n, age||'5', gender||'男', hobbies||''), title: n + '的' + theme + '故事' });
});

// ========== AI Helper ==========
async function callAI(messages) {
  if (!AI_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(AI_URL + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify({ model: AI_MODEL, messages, stream: false }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (e) { clearTimeout(timer); console.error('AI error:', e.message); return null; }
}

// ========== Start ==========
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'AI 宝贝', ai: AI_MODEL }));

initDB().then(() => {
  app.listen(PORT, () => {
    console.log('\n🤱 AI 宝贝 已启动！');
    console.log('   http://localhost:' + PORT);
    console.log('   AI: ' + (AI_KEY ? AI_MODEL + ' ✅' : '模拟模式 ⚙️') + '\n');
  });
}).catch(e => console.error('DB init failed:', e));
