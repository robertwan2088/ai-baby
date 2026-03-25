// AI 宝贝 - 完整后端 API（包含管理后台）
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// 数据库
const DB_PATH = '/home/ubuntu/projects/ai-baby-server/data/ai-baby.db';

// JWT Secret
const JWT_SECRET = 'ai-baby-admin-secret';

// 初始化数据库
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = require('better-sqlite3')(DB_PATH);
db.pragma('foreign_keys', 'ON');

// 初始化表
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

    // Logs
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        ip_address VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 初始化管理员
    const adminPass = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', adminPass);

    // 初始化示例数据
    const initGames = db.prepare('INSERT OR IGNORE INTO games (title, icon, description, category, age_range, rating, thumbnail, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    [
        ['幼儿拼图', '🧩', '拼图游戏，锻炼动手能力', '益智', '2-4岁', 4.8, '', 1],
        ['颜色认知', '🎨', '认识颜色和形状', '启蒙', '2-3岁', 4.5, '', 1],
        ['数字游戏', '🔢', '认识数字，简单加减', '数学', '3-5岁', 4.7, '', 0]
    ].forEach(g => initGames.run(...g));

    const initQA = db.prepare('INSERT OR IGNORE INTO qa (question, answer, category, tags) VALUES (?, ?, ?, ?)');
    [
        ['宝宝不爱吃饭怎么办？', '建议：1.不要强迫 2.让孩子参与 3.固定用餐时间 4.做好榜样', '喂养', '挑食,吃饭'],
        ['宝宝多大可以上幼儿园？', '3-4岁是比较合适的入园年龄。可以从半天托班开始，逐渐适应。', '教育', '入园,幼儿园']
    ].forEach(q => initQA.run(...q));
});

// 中间件
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未登录' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token 无效' });
    }
};

const requireAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未登录' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: '权限不足' });
        req.adminId = decoded.id;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token 无效' });
    }
};

// CORS
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 公开 API

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'AI 宝贝 API', version: '2.0.0' });
});

// 图形验证码
app.get('/api/captcha', (req, res) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
  <rect width="100%" height="100%" fill="#f8f9fa"/>
  <text x="10" y="28" font-size="24" font-weight="bold" fill="#667eea">${code[0]}</text>
  <text x="40" y="28" font-size="24" font-weight="bold" fill="#764ba2">${code[1]}</text>
  <text x="70" y="28" font-size="24" font-weight="bold" fill="#f093fb">${code[2]}</text>
  <text x="100" y="28" font-size="24" font-weight="bold" fill="#f5576c">${code[3]}</text>
  <line x1="20" y1="10" x2="40" y2="30" stroke="#e2e8f0" stroke-width="2"/>
  <circle cx="85" cy="15" r="3" fill="#e2e8f0"/>
  <circle cx="105" cy="35" r="2" fill="#e2e8f0"/>
</svg>`;

    res.json({
        id: Date.now().toString(),
        code: code,
        svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
        expires_at: Date.now() + 300000
    });
});

// 用户认证
app.post('/api/auth/register', (req, res) => {
    const { phone, captcha_code } = req.body;

    if (!phone || !/^1\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (existing) {
        return res.status(400).json({ error: '该手机号已注册' });
    }

    // 创建用户
    const result = db.prepare('INSERT INTO users (phone, nickname, avatar) VALUES (?, ?, ?)').run(
        phone,
        '用户' + phone.substring(7),
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone
    );

    if (result.changes === 0) {
        return res.status(500).json({ error: '注册失败，请重试' });
    }

    const token = jwt.sign({ userId: result.lastInsertRowid, phone: phone }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
        success: true,
        message: '注册成功',
        token,
        user: {
            id: result.lastInsertRowid,
            phone: phone,
            nickname: '用户' + phone.substring(7),
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone
        }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { phone, captcha_code } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
        return res.status(400).json({ error: '手机号未注册，请先注册' });
    }

    const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
        success: true,
        message: '登录成功',
        token,
        user: {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            avatar: user.avatar
        }
    });
});

// 宝贝管理
app.get('/api/babies', requireAuth, (req, res) => {
    const babies = db.prepare('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, babies });
});

app.post('/api/babies', requireAuth, (req, res) => {
    const { name, gender, birthday, avatar, favorite } = req.body;

    if (!name) return res.status(400).json({ error: '请填写宝贝名字' });

    const result = db.prepare('INSERT INTO babies (user_id, name, gender, birthday, avatar, favorite) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.userId,
        name,
        gender,
        birthday,
        avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + name,
        favorite || ''
    );

    db.prepare('UPDATE users SET baby_count = baby_count + 1 WHERE id = ?').run(req.userId);

    res.json({ success: true, message: '宝贝添加成功', baby: { id: result.lastInsertRowid } });
});

app.put('/api/babies/:id', requireAuth, (req, res) => {
    const { name, gender, birthday, avatar, favorite } = req.body;

    const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
    if (!baby || baby.user_id !== req.userId) {
        return res.status(403).json({ error: '无权限操作' });
    }

    db.prepare('UPDATE babies SET name = ?, gender = ?, birthday = ?, avatar = ?, favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        name, gender, birthday, avatar, favorite, req.params.id
    );

    res.json({ success: true, message: '更新成功' });
});

app.delete('/api/babies/:id', requireAuth, (req, res) => {
    const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
    if (!baby || baby.user_id !== req.userId) {
        return res.status(403).json({ error: '无权限操作' });
    }

    db.prepare('DELETE FROM babies WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE users SET baby_count = baby_count - 1 WHERE id = ?').run(req.userId);

    res.json({ success: true, message: '删除成功' });
});

// 游戏 API
app.get('/api/games', (req, res) => {
    const { category, age_range, is_featured } = req.query;

    let sql = 'SELECT * FROM games';
    const params = [];

    if (category && category !== 'all') {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    if (age_range && age_range !== 'all') {
        if (category) sql += ' AND';
        sql += ' age_range = ?';
        params.push(age_range);
    }

    if (is_featured === 'true') {
        if (category || age_range) sql += ' AND';
        sql += ' is_featured = 1';
    }

    sql += ' ORDER BY is_featured DESC, rating DESC, created_at DESC';

    const games = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();

    res.json({ success: true, games });
});

app.get('/api/games/:id', (req, res) => {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: '游戏不存在' });

    // 增加下载次数
    db.prepare('UPDATE games SET download_count = download_count + 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, game });
});

// 问答 API
app.get('/api/qa', (req, res) => {
    const { category } = req.query;

    let sql = 'SELECT * FROM qa';
    const params = [];

    if (category && category !== 'all') {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    sql += ' ORDER BY created_at DESC';

    const qa = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();

    res.json({ success: true, qa });
});

app.get('/api/qa/:id', (req, res) => {
    const question = db.prepare('SELECT * FROM qa WHERE id = ?').get(req.params.id);
    if (!question) return res.status(404).json({ error: '问题不存在' });

    // 增加浏览次数
    db.prepare('UPDATE qa SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, question });
});

app.post('/api/qa/:id/like', requireAuth, (req, res) => {
    const question = db.prepare('SELECT * FROM qa WHERE id = ?').get(req.params.id);
    if (!question) return res.status(404).json({ error: '问题不存在' });

    db.prepare('UPDATE qa SET likes = likes + 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: '点赞成功' });
});

// 推荐内容 API
app.get('/api/recommendations', (req, res) => {
    const { category } = req.query;

    let sql = 'SELECT * FROM recommendations';
    const params = [];

    if (category && category !== 'all') {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    sql += ' ORDER BY is_featured DESC, order_num ASC, created_at DESC';

    const recommendations = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();

    res.json({ success: true, recommendations });
});

// ========== 管理员 API ==========

// 管理员登录
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) return res.status(401).json({ error: '用户名或密码错误' });

    if (!bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ id: admin.id, role: 'admin', username: admin.username }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ success: true, message: '登录成功', token, admin: { id: admin.id, username: admin.username } });
});

// 获取管理员信息
app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json({ success: true, admin: { id: req.adminId, role: 'admin' } });
});

// 仪表盘数据
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const babies = db.prepare('SELECT COUNT(*) as c FROM babies').get().c;
    const games = db.prepare('SELECT COUNT(*) as c FROM games').get().c;
    const qa = db.prepare('SELECT COUNT(*) as c FROM qa').get().c;
    const recommendations = db.prepare('SELECT COUNT(*) as c FROM recommendations').get().c;

    res.json({
        success: true,
        stats: { users, babies, games, qa, recommendations }
    });
});

// ========== 管理功能 ==========

// 游戏管理
app.get('/api/admin/games', requireAdmin, (req, res) => {
    const games = db.prepare('SELECT * FROM games ORDER BY id DESC').all();
    res.json({ success: true, games });
});

app.post('/api/admin/games', requireAdmin, (req, res) => {
    const { title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating } = req.body;

    db.prepare('INSERT INTO games (title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        title,
        icon || '🎮',
        description || '',
        category || '益智',
        age_range || '2-4岁',
        thumbnail || '',
        content || '',
        is_featured ? 1 : 0,
        download_count || 0,
        rating || 4.5
    );

    res.json({ success: true, message: '游戏添加成功' });
});

app.put('/api/admin/games/:id', requireAdmin, (req, res) => {
    const { title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating } = req.body;

    db.prepare('UPDATE games SET title = ?, icon = ?, description = ?, category = ?, age_range = ?, thumbnail = ?, content = ?, is_featured = ?, download_count = ?, rating = ? WHERE id = ?').run(
        title, icon, description, category, age_range, thumbnail, content, is_featured ? 1 : 0, download_count, rating, req.params.id
    );

    res.json({ success: true, message: '游戏更新成功' });
});

app.delete('/api/admin/games/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '游戏删除成功' });
});

// 问答管理
app.get('/api/admin/qa', requireAdmin, (req, res) => {
    const qa = db.prepare('SELECT * FROM qa ORDER BY id DESC').all();
    res.json({ success: true, qa });
});

app.post('/api/admin/qa', requireAdmin, (req, res) => {
    const { question, answer, category, tags } = req.body;

    db.prepare('INSERT INTO qa (question, answer, category, tags) VALUES (?, ?, ?, ?)').run(
        question,
        answer || '',
        category || '喂养',
        tags || ''
    );

    res.json({ success: true, message: '问答添加成功' });
});

app.put('/api/admin/qa/:id', requireAdmin, (req, res) => {
    const { question, answer, category, tags } = req.body;

    db.prepare('UPDATE qa SET question = ?, answer = ?, category = ?, tags = ? WHERE id = ?').run(
        question, answer, category, tags, req.params.id
    );

    res.json({ success: true, message: '问答更新成功' });
});

app.delete('/api/admin/qa/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM qa WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '问答删除成功' });
});

// 推荐管理
app.get('/api/admin/recommendations', requireAdmin, (req, res) => {
    const recommendations = db.prepare('SELECT * FROM recommendations ORDER BY id DESC').all();
    res.json({ success: true, recommendations });
});

app.post('/api/admin/recommendations', requireAdmin, (req, res) => {
    const { title, content, category, thumbnail, link, is_featured, order_num } = req.body;

    db.prepare('INSERT INTO recommendations (title, content, category, thumbnail, link, is_featured, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        title,
        content || '',
        category || '推荐',
        thumbnail || '',
        link || '',
        is_featured ? 1 : 0,
        order_num || 0
    );

    res.json({ success: true, message: '推荐添加成功' });
});

app.put('/api/admin/recommendations/:id', requireAdmin, (req, res) => {
    const { title, content, category, thumbnail, link, is_featured, order_num } = req.body;

    db.prepare('UPDATE recommendations SET title = ?, content = ?, category = ?, thumbnail = ?, link = ?, is_featured = ?, order_num = ? WHERE id = ?').run(
        title, content, category, thumbnail, link, is_featured ? 1 : 0, order_num, req.params.id
    );

    res.json({ success: true, message: '推荐更新成功' });
});

app.delete('/api/admin/recommendations/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM recommendations WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '推荐删除成功' });
});

// 用户管理
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY id DESC').all();
    res.json({ success: true, users });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 删除用户时会自动删除其宝贝信息（外键）
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: '用户删除成功' });
});

// AI 对话 API
app.post('/api/chat', async (req, res) => {
    const { message, baby_id } = req.body;

    if (!message) return res.status(400).json({ error: '请输入消息' });

    let babyPrompt = '';
    if (baby_id) {
        const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(baby_id);
        if (baby) {
            babyPrompt = `这是一个关于${baby.name}（${baby.gender}，${baby.birthday}出生）的问题。${baby.favorite}。`;
        }
    }

    try {
        const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer sk-3cbe92e98cc6468395f4cbae2b05aaa0`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: '你是AI宝贝，一位专业的儿童教育顾问。请用温暖、耐心、鼓励的语气回答家长关于幼儿教育的问题。回答要具体可操作，200-400字。先共情再给建议。' },
                    { role: 'user', content: babyPrompt + message }
                ],
                max_tokens: 1000
            })
        });

        const data = await resp.json();
        const reply = data.choices[0]?.message?.content || '抱歉，我暂时无法回答。';

        res.json({ reply });
    } catch (e) {
        res.json({ reply: 'AI服务暂时不可用，请稍后再试。' });
    }
});

// 管理后台 SPA 路由
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'production' ? '出错了' : err.message
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ success: false, error: '接口不存在' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('\n👶 AI 宝贝 API 已启动！');
    console.log(`   📡 端口: ${PORT}`);
    console.log(`   🤖 数据库: SQLite3`);
    console.log(`   👤 管理员: admin (密码: admin123)\n`);
});

module.exports = app;
