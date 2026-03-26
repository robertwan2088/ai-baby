const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'client')));

const AI_URL = process.env.AI_API_URL || 'https://api.deepseek.com';
const AI_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';
const DB_FILE = '/tmp/aibaby.json';

let db;
function loadDB() { try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { db = { users:{}, children:[], messages:[], books:[], growth:[], favorites:[] }; } }
function saveDB() { try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch(e) {} }
function uid() { return crypto.randomBytes(16).toString('hex'); }
loadDB();

function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const u = Object.values(db.users).find(x => x.token === t);
  if (!u) return res.status(401).json({ error: '请先登录' });
  req.user = u;
  req.token = t;
  next();
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'AI 宝贝', ai: AI_MODEL }));

// 验证码存储（手机号 -> { code, expireAt }）
const verifyCodes = new Map();

function genCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// 发送验证码
app.post('/api/send-code', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^1\d{10}$/.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' });
  const code = genCode();
  verifyCodes.set(phone, { code, expireAt: Date.now() + 60 * 1000 });
  console.log(`📱 验证码: ${phone} -> ${code} (60秒有效)`);
  res.json({ success: true, code });
});

// 校验验证码
function checkCode(phone, code) {
  if (!phone || !code) return { ok: false, error: '请输入验证码' };
  const r = verifyCodes.get(phone);
  if (!r) return { ok: false, error: '请先获取验证码' };
  if (Date.now() > r.expireAt) { verifyCodes.delete(phone); return { ok: false, error: '验证码已过期' }; }
  if (r.code !== code) return { ok: false, error: '验证码错误' };
  verifyCodes.delete(phone);
  return { ok: true };
}

// Auth
app.post('/api/login', (req, res) => {
  const { phone, code } = req.body;
  if (!phone) return res.status(400).json({ error: '请输入手机号' });
  // 验证码校验
  const v = checkCode(phone, code);
  if (!v.ok) return res.status(400).json({ error: v.error });
  if (!db.users[phone]) {
    const token = uid();
    db.users[phone] = { id: uid(), phone, nickname: '宝妈' + phone.slice(-4), avatar: '', token };
    saveDB();
    return res.json({ phone, nickname: db.users[phone].nickname, token });
  }
  db.users[phone].token = uid();
  saveDB();
  res.json({ phone, nickname: db.users[phone].nickname, token: db.users[phone].token });
});

app.post('/api/register', (req, res) => {
  const { phone, code, nickname } = req.body;
  if (!phone) return res.status(400).json({ error: '请输入手机号' });
  const v = checkCode(phone, code);
  if (!v.ok) return res.status(400).json({ error: v.error });
  if (db.users[phone]) return res.status(400).json({ error: '该手机号已注册' });
  const token = uid();
  db.users[phone] = { id: uid(), phone, nickname: nickname || '宝妈' + phone.slice(-4), avatar: '', token };
  saveDB();
  res.json({ phone, nickname: db.users[phone].nickname, token });
});

// Profile
app.get('/api/user/profile', auth, (req, res) => {
  const books = db.books.filter(b => b.token === req.token);
  const msgs = db.messages.filter(m => m.token === req.token);
  const children = db.children.filter(c => c.token === req.token);
  const days = new Set(msgs.map(m => new Date(m.created_at).toDateString())).size;
  res.json({ phone: req.user.phone, nickname: req.user.nickname, book_count: books.length, chat_count: msgs.length, active_days: Math.max(days, 1), children });
});

app.put('/api/user/profile', auth, (req, res) => {
  const { nickname, avatar } = req.body;
  const u = db.users[req.user.phone];
  if (nickname) u.nickname = nickname;
  if (avatar) u.avatar = avatar;
  saveDB();
  res.json({ ok: true });
});

// Children
app.post('/api/children', auth, (req, res) => {
  const { name, age, gender, hobbies } = req.body;
  if (!name) return res.status(400).json({ error: '请输入名字' });
  db.children.push({ id: uid(), token: req.token, name, age: age || 0, gender: gender || '男', avatar: gender === '女' ? '👧' : '👦', hobbies: hobbies || '', created_at: Date.now() });
  saveDB();
  res.json({ ok: true });
});

app.delete('/api/children/:id', auth, (req, res) => {
  db.children = db.children.filter(c => c.id !== req.params.id);
  saveDB();
  res.json({ ok: true });
});

// Chat
app.get('/api/chat/history', auth, (req, res) => {
  res.json({ messages: db.messages.filter(m => m.token === req.token).slice(-100) });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: '请输入问题' });
  const token = req.body.token || '';
  const aiReply = await callAI([
    { role: 'system', content: '你是一位专业的幼儿教育顾问。回答要温和耐心，给出具体建议，200-400字。先共情再给建议。' },
    { role: 'user', content: message }
  ]);
  if (aiReply && token && db.users[Object.keys(db.users).find(k => db.users[k].token === token)]) {
    db.messages.push({ id: uid(), token, role: 'user', content: message, created_at: Date.now() });
    db.messages.push({ id: uid(), token, role: 'ai', content: aiReply, created_at: Date.now() });
    saveDB();
  }
  if (aiReply) return res.json({ reply: aiReply });
  // Mock fallback
  const low = message.toLowerCase();
  const QA = [
    { kw: ['吃饭','挑食'], a: '建议：1.不要强迫进食 2.让孩子参与做饭 3.固定用餐时间 4.做好榜样 5.让食物变有趣' },
    { kw: ['发脾气','情绪'], a: '处理方法：先接纳情绪保持冷静，等平静后沟通。预防：识别触发点，提前预告，教情绪词汇。' },
    { kw: ['阅读','绘本'], a: '3-4岁每天15分钟亲子共读，4-5岁20分钟，5-6岁开始自主阅读。关键：固定时间、让孩子选书。' },
    { kw: ['睡觉','睡眠'], a: '3-5岁10-13小时，5-6岁10-12小时。固定作息、睡前仪式、避免屏幕。' },
  ];
  let reply = '建议：1.尊重孩子节奏 2.多观察少干预 3.保持耐心 4.以身作则。';
  for (const q of QA) { if (q.kw.some(k => low.includes(k))) { reply = q.a; break; } }
  res.json({ reply });
});

// Books
app.get('/api/books', auth, (req, res) => {
  res.json({ books: db.books.filter(b => b.token === req.token).reverse() });
});

app.post('/api/books', auth, (req, res) => {
  const { title, content, theme, child_name } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  db.books.push({ id: uid(), token: req.token, title, content, theme: theme || '', child_name: child_name || '', created_at: Date.now() });
  saveDB();
  res.json({ ok: true });
});

app.delete('/api/books/:id', auth, (req, res) => {
  db.books = db.books.filter(b => b.id !== req.params.id);
  saveDB();
  res.json({ ok: true });
});

// Growth
app.get('/api/growth', auth, (req, res) => {
  res.json({ records: db.growth.filter(r => r.token === req.token).reverse() });
});

app.post('/api/growth', auth, (req, res) => {
  const { title, content, emoji } = req.body;
  if (!title) return res.status(400).json({ error: '请输入标题' });
  db.growth.push({ id: uid(), token: req.token, title, content: content || '', emoji: emoji || '📝', created_at: Date.now() });
  saveDB();
  res.json({ ok: true });
});

// Favorites
app.get('/api/favorites', auth, (req, res) => {
  res.json({ favorites: db.favorites.filter(f => f.token === req.token).reverse() });
});

app.post('/api/favorites', auth, (req, res) => {
  const { item_type, item_id, title, content } = req.body;
  if (!item_type || !item_id) return res.status(400).json({ error: '参数错误' });
  db.favorites.push({ id: uid(), token: req.token, item_type, item_id, title: title || '', content: content || '', created_at: Date.now() });
  saveDB();
  res.json({ ok: true });
});

app.delete('/api/favorites/:id', auth, (req, res) => {
  db.favorites = db.favorites.filter(f => f.id !== req.params.id);
  saveDB();
  res.json({ ok: true });
});

// Story
app.post('/api/story', async (req, res) => {
  const { name, age, gender, hobbies, theme } = req.body;
  if (!name || !theme) return res.status(400).json({ error: '请填写名字和主题' });
  const aiStory = await callAI([
    { role: 'system', content: '你是一位优秀的儿童绘本作家。为3-6岁儿童创作300-500字的故事。语言简单生动，融入孩子名字和喜好。结尾温暖。' },
    { role: 'user', content: `孩子：${name}，${age}岁，${gender}，爱好：${hobbies||'无'}，主题：${theme}。请创作专属故事。` }
  ]);
  if (aiStory) return res.json({ story: aiStory, title: name + '的' + theme + '故事' });
  const TPL = {
    '睡前故事': (n) => `从前，有一个叫${n}的小朋友。\n\n每天晚上，${n}最喜欢听妈妈讲故事。今天妈妈说："要不要去星星的世界看看呀？"\n\n${n}的眼睛亮了起来。窗外飘进来一颗星星，落在${n}的手心里。\n\n"跟我来吧，"小星星说。\n\n${n}牵着小星星飞过了屋顶和云层，来到满天繁星的夜空。星星们唱着歌迎接${n}。\n\n${n}慢慢闭上了眼睛，星星们用星光给他盖了一床暖暖的光毯。\n\n"晚安，${n}。"月亮婆婆说，"明天又是美好的一天。"\n\n${n}微笑着进入了梦乡。🌙`,
    '冒险探索': (n) => `从前，有一个叫${n}的小朋友。\n\n有一天，${n}在后院发现了一个发光的盒子，里面跳出一个会说话的指南针："想去一个从没人去过的地方吗？"\n\n于是${n}出发了。穿过唱歌的花田，踩石头过了小溪，到了山顶。\n\n山顶有棵"勇气之树"，结满了彩色的果实。\n\n"每颗果实都是勇气，"小指南针说，"你让这棵树长出了新的果实。"\n\n${n}摘了一颗金色果实放进口袋，心里暖暖的——原来勇气就在自己心里。🌟`,
  };
  const tpl = TPL[theme] || TPL['冒险探索'];
  res.json({ story: tpl(n), title: n + '的' + theme + '故事' });
});

// AI
async function callAI(messages) {
  if (!AI_KEY) return null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);
  try {
    const r = await fetch(AI_URL + '/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify({ model: AI_MODEL, messages, stream: false }), signal: ac.signal
    });
    clearTimeout(timer);
    const d = await r.json();
    return d.choices[0].message.content;
  } catch (e) { clearTimeout(timer); return null; }
}

// Start
app.listen(PORT, () => {
  console.log('\n🤱 AI 宝贝 已启动！');
  console.log('   http://localhost:' + PORT);
  console.log('   AI: ' + (AI_KEY ? AI_MODEL + ' ✅' : '模拟模式 ⚙️') + '\n');
});
