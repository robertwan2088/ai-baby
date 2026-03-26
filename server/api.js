// AI 宝贝 - 完整后端 API (better-sqlite3 + CommonJS)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

const db = require('./init-db');
const CaptchaGenerator = require('./utils/captcha');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ai-baby-secret-2024';

// ========== 验证码内存存储 ==========
const captchaStore = new Map();
// 每5分钟清理过期验证码
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of captchaStore) {
        if (now > data.expires_at) captchaStore.delete(id);
    }
}, 300000);

// ========== AI 配置 ==========
const AI_URL = process.env.AI_API_URL || 'https://api.deepseek.com';
const AI_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ========== 中间件 ==========

// 验证手机号格式
const validatePhone = (req, res, next) => {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确，请输入11位手机号码' });
    }
    next();
};

// 验证图形验证码 (服务端校验)
const validateCaptcha = (req, res, next) => {
    const { captcha_id, captcha_code } = req.body;
    if (!captcha_id || !captcha_code) {
        return res.status(400).json({ error: '请输入验证码' });
    }
    const stored = captchaStore.get(captcha_id);
    if (!stored) {
        return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }
    if (Date.now() > stored.expires_at) {
        captchaStore.delete(captcha_id);
        return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }
    if (stored.code.toLowerCase() !== captcha_code.toLowerCase()) {
        return res.status(400).json({ error: '验证码错误' });
    }
    // 验证通过后删除，防止重复使用
    captchaStore.delete(captcha_id);
    next();
};

// JWT 认证中间件
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userPhone = decoded.phone;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token 无效或已过期' });
    }
};

// 管理员认证中间件 (基于 JWT)
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: '无管理员权限' });
        }
        req.adminId = decoded.adminId;
        req.adminUsername = decoded.username;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token 无效或已过期' });
    }
};

// ========== 公开 API ==========

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'AI 宝贝',
        version: '2.0.0',
        database: 'connected',
        ai: AI_MODEL,
        ai_configured: !!AI_KEY
    });
});

// 生成图形验证码
app.get('/api/captcha', (req, res) => {
    const captcha = new CaptchaGenerator();
    const code = captcha.generate(4);
    const svg = captcha.createSVG(code);
    const id = crypto.randomUUID();

    captchaStore.set(id, {
        code: code,
        expires_at: Date.now() + 60000 // 5分钟
    });

    res.json({
        id: id,
        svg: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        expires_at: Date.now() + 60000
    });
});

// ========== 用户认证 API ==========

// 用户注册：手机号 + 密码 + 昵称 + 图形验证码
app.post('/api/auth/register', validatePhone, validateCaptcha, (req, res) => {
    const { phone, password, nickname } = req.body;

    if (!password || password.length < 6 || password.length > 20) {
        return res.status(400).json({ error: '密码长度需要 6-20 位' });
    }

    // 检查手机号是否已注册
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) {
        return res.status(400).json({ error: '该手机号已注册，请直接登录' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const nick = nickname || '用户' + phone.substring(7);

    const result = db.prepare('INSERT INTO users (phone, password_hash, nickname, avatar) VALUES (?, ?, ?, ?)').run(
        phone,
        passwordHash,
        nick,
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone
    );

    // 生成 token
    const token = jwt.sign(
        { userId: result.lastInsertRowid, phone: phone },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        success: true,
        message: '注册成功',
        token: token,
        user: {
            id: result.lastInsertRowid,
            phone: phone,
            nickname: nick,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone
        }
    });
});

// 用户登录：手机号 + 密码 + 图形验证码
app.post('/api/auth/login', validatePhone, validateCaptcha, (req, res) => {
    const { phone, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
        return res.status(400).json({ error: '手机号未注册' });
    }

    if (!user.password_hash) {
        return res.status(400).json({ error: '该账号未设置密码，请重置密码' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(400).json({ error: '密码错误' });
    }

    // 生成 token
    const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        success: true,
        message: '登录成功',
        token: token,
        user: {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            avatar: user.avatar
        }
    });
});

// 获取当前用户信息
app.get('/api/user/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, phone, nickname, avatar, baby_count, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    const babies = db.prepare('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);

    res.json({ success: true, user, babies });
});

// 更新用户信息
app.put('/api/user/me', requireAuth, (req, res) => {
    const { nickname, avatar } = req.body;
    if (nickname) {
        db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.userId);
    }
    if (avatar) {
        db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.userId);
    }
    db.prepare('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.userId);

    const user = db.prepare('SELECT id, phone, nickname, avatar FROM users WHERE id = ?').get(req.userId);
    res.json({ success: true, message: '更新成功', user });
});

// ========== 宝贝管理 API ==========

app.post('/api/babies', requireAuth, (req, res) => {
    const { name, gender, birthday, avatar, favorite } = req.body;
    if (!name) return res.status(400).json({ error: '请填写宝贝名字' });

    const result = db.prepare('INSERT INTO babies (user_id, name, gender, birthday, avatar, favorite) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.userId, name, gender, birthday,
        avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + name + Date.now(),
        favorite || ''
    );
    db.prepare('UPDATE users SET baby_count = baby_count + 1 WHERE id = ?').run(req.userId);

    const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, message: '宝贝添加成功', baby });
});

app.get('/api/babies', requireAuth, (req, res) => {
    const babies = db.prepare('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, babies });
});

app.put('/api/babies/:id', requireAuth, (req, res) => {
    const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
    if (!baby || baby.user_id !== req.userId) return res.status(403).json({ error: '无权限操作' });

    const { name, gender, birthday, avatar, favorite } = req.body;
    db.prepare('UPDATE babies SET name = ?, gender = ?, birthday = ?, avatar = ?, favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        name || baby.name, gender || baby.gender, birthday || baby.birthday,
        avatar || baby.avatar, favorite !== undefined ? favorite : baby.favorite, req.params.id
    );

    res.json({ success: true, message: '更新成功' });
});

app.delete('/api/babies/:id', requireAuth, (req, res) => {
    const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
    if (!baby || baby.user_id !== req.userId) return res.status(403).json({ error: '无权限操作' });

    db.prepare('DELETE FROM babies WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE users SET baby_count = MAX(0, baby_count - 1) WHERE id = ?').run(req.userId);

    res.json({ success: true, message: '删除成功' });
});

// ========== 游戏 API ==========

app.get('/api/games', (req, res) => {
    const { category, age_range, is_featured } = req.query;
    let sql = 'SELECT * FROM games WHERE 1=1';
    const params = [];

    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (age_range) { sql += ' AND age_range = ?'; params.push(age_range); }
    if (is_featured === 'true' || is_featured === '1') { sql += ' AND is_featured = 1'; }
    sql += ' ORDER BY is_featured DESC, rating DESC, created_at DESC';

    const games = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();
    res.json({ success: true, games });
});

app.get('/api/games/:id', (req, res) => {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: '游戏不存在' });
    res.json({ success: true, game });
});

app.post('/api/games/:id/download', requireAuth, (req, res) => {
    db.prepare('UPDATE games SET download_count = download_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '下载次数已更新' });
});

// ========== 问答 API ==========

app.get('/api/qa', (req, res) => {
    const { category } = req.query;
    let sql = 'SELECT * FROM qa';
    const params = [];
    if (category) { sql += ' WHERE category = ?'; params.push(category); }
    sql += ' ORDER BY created_at DESC';

    const qa = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();
    res.json({ success: true, qa });
});

app.get('/api/qa/:id', (req, res) => {
    const question = db.prepare('SELECT * FROM qa WHERE id = ?').get(req.params.id);
    if (!question) return res.status(404).json({ error: '问题不存在' });
    db.prepare('UPDATE qa SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, question });
});

app.post('/api/qa/:id/like', requireAuth, (req, res) => {
    const question = db.prepare('SELECT * FROM qa WHERE id = ?').get(req.params.id);
    if (!question) return res.status(404).json({ error: '问题不存在' });
    db.prepare('UPDATE qa SET likes = likes + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '点赞成功' });
});

// ========== 推荐内容 API ==========

app.get('/api/recommendations', (req, res) => {
    const { category } = req.query;
    let sql = 'SELECT * FROM recommendations WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY is_featured DESC, order_num ASC, created_at DESC';

    const recommendations = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();
    res.json({ success: true, recommendations });
});

// ========== 管理员 API (JWT 认证) ==========

// 管理员登录
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
        { adminId: admin.id, username: admin.username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        success: true,
        message: '登录成功',
        token: token,
        admin: { id: admin.id, username: admin.username }
    });
});

// 获取管理员信息
app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json({ success: true, admin: { id: req.adminId, username: req.adminUsername } });
});

// 管理员登出 (客户端删 token 即可)
app.post('/api/admin/logout', (req, res) => {
    res.json({ success: true, message: '登出成功' });
});

// 仪表盘数据
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = {
        users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
        babies: db.prepare('SELECT COUNT(*) as c FROM babies').get().c,
        games: db.prepare('SELECT COUNT(*) as c FROM games').get().c,
        qa: db.prepare('SELECT COUNT(*) as c FROM qa').get().c,
        recommendations: db.prepare('SELECT COUNT(*) as c FROM recommendations').get().c
    };
    res.json({ success: true, stats });
});

// 游戏管理 CRUD
app.get('/api/admin/games', requireAdmin, (req, res) => {
    res.json({ success: true, games: db.prepare('SELECT * FROM games ORDER BY id DESC').all() });
});

app.post('/api/admin/games', requireAdmin, (req, res) => {
    const { title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating } = req.body;
    if (!title) return res.status(400).json({ error: '请输入游戏名称' });

    db.prepare('INSERT INTO games (title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        title, icon || '🎮', description, category, age_range, thumbnail, content,
        is_featured ? 1 : 0, download_count || 0, rating || 4.5
    );
    res.json({ success: true, message: '游戏添加成功' });
});

app.put('/api/admin/games/:id', requireAdmin, (req, res) => {
    const { title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating } = req.body;
    db.prepare('UPDATE games SET title=?, icon=?, description=?, category=?, age_range=?, thumbnail=?, content=?, is_featured=?, download_count=?, rating=? WHERE id=?').run(
        title, icon, description, category, age_range, thumbnail, content,
        is_featured ? 1 : 0, download_count, rating, req.params.id
    );
    res.json({ success: true, message: '游戏更新成功' });
});

app.delete('/api/admin/games/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '游戏删除成功' });
});

// 问答管理 CRUD
app.get('/api/admin/qa', requireAdmin, (req, res) => {
    res.json({ success: true, qa: db.prepare('SELECT * FROM qa ORDER BY id DESC').all() });
});

app.post('/api/admin/qa', requireAdmin, (req, res) => {
    const { question, answer, category, tags } = req.body;
    if (!question || !answer) return res.status(400).json({ error: '请输入问题和答案' });
    db.prepare('INSERT INTO qa (question, answer, category, tags) VALUES (?, ?, ?, ?)').run(question, answer, category, tags);
    res.json({ success: true, message: '问答添加成功' });
});

app.put('/api/admin/qa/:id', requireAdmin, (req, res) => {
    const { question, answer, category, tags } = req.body;
    db.prepare('UPDATE qa SET question=?, answer=?, category=?, tags=? WHERE id=?').run(question, answer, category, tags, req.params.id);
    res.json({ success: true, message: '问答更新成功' });
});

app.delete('/api/admin/qa/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM qa WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '问答删除成功' });
});

// 推荐管理 CRUD
app.get('/api/admin/recommendations', requireAdmin, (req, res) => {
    res.json({ success: true, recommendations: db.prepare('SELECT * FROM recommendations ORDER BY id DESC').all() });
});

app.post('/api/admin/recommendations', requireAdmin, (req, res) => {
    const { title, content, category, thumbnail, link, is_featured, order_num } = req.body;
    if (!title) return res.status(400).json({ error: '请输入标题' });
    db.prepare('INSERT INTO recommendations (title, content, category, thumbnail, link, is_featured, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        title, content, category, thumbnail, link, is_featured ? 1 : 0, order_num || 0
    );
    res.json({ success: true, message: '推荐添加成功' });
});

app.put('/api/admin/recommendations/:id', requireAdmin, (req, res) => {
    const { title, content, category, thumbnail, link, is_featured, order_num } = req.body;
    db.prepare('UPDATE recommendations SET title=?, content=?, category=?, thumbnail=?, link=?, is_featured=?, order_num=? WHERE id=?').run(
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
    res.json({ success: true, users: db.prepare('SELECT id, phone, nickname, avatar, baby_count, created_at FROM users ORDER BY id DESC').all() });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    db.prepare('DELETE FROM babies WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '用户删除成功' });
});

// ========== AI 对话 API ==========

async function callAI(messages) {
    if (!AI_KEY) return null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const resp = await fetch(AI_URL + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_KEY}` },
            body: JSON.stringify({ model: AI_MODEL, messages, max_tokens: 1000 }),
            signal: controller.signal
        });
        clearTimeout(timer);
        const data = await resp.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (e) {
        console.error('AI error:', e.message);
        return null;
    }
}

// AI 聊天
app.post('/api/chat', async (req, res) => {
    const { message, baby_id } = req.body;
    if (!message) return res.status(400).json({ error: '请输入消息' });

    let babyPrompt = '';
    if (baby_id) {
        const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(baby_id);
        if (baby) {
            const age = baby.birthday ? calculateAge(baby.birthday) : '未知';
            babyPrompt = `这是关于${baby.name}（${baby.gender}，${age}）的问题。`;
        }
    }

    const aiReply = await callAI([
        { role: 'system', content: '你是AI宝贝，一位专业的儿童教育顾问。请用温暖、耐心、鼓励的语气回答家长关于幼儿教育的问题。回答要具体可操作，200-400字。先共情再给建议，涉及健康问题建议就医。' },
        { role: 'user', content: babyPrompt + message }
    ]);

    if (aiReply) return res.json({ reply: aiReply });

    // 降级到规则匹配
    const low = message.toLowerCase();
    const rules = [
        { kw: ['吃饭', '挑食', '不吃饭', '厌食'], a: '孩子挑食很常见。\n\n**几个实用建议：**\n1. **不要强迫**：让孩子自己决定吃什么吃多少\n2. **让孩子参与做饭**：一起买菜、洗菜、摆盘\n3. **固定用餐时间**：饭前1小时不吃零食\n4. **做好榜样**：家长也多样化饮食\n5. **让食物变有趣**：切成有趣形状\n\n持续一个月体重不增，建议看儿科。' },
        { kw: ['睡觉', '睡眠', '晚睡'], a: '各年龄段推荐睡眠：\n- 3-5岁：10-13小时\n- 5-6岁：10-12小时\n\n**建议：**\n1. 固定作息时间\n2. 建立睡前仪式（洗澡→故事→晚安）\n3. 睡前1小时避免屏幕\n4. 白天充分活动' },
        { kw: ['发脾气', '生气', '哭闹', '情绪'], a: '孩子发脾气是正常的情绪表达方式。\n\n**当下：** 先接纳情绪，保持冷静，等孩子平静后再说\n\n**预防：** 识别触发点，提前预告，教情绪词汇\n\n4岁以上仍频繁激烈发脾气建议咨询专业人士。' },
        { kw: ['入园', '上学', '小学', '学前'], a: '幼小衔接建议：\n\n**学习能力**：每天15-20分钟专注力训练\n**生活自理**：自己穿衣、系鞋带、整理书包\n**社交能力**：学会合作、分享、表达需求\n**心理准备**：多聊小学的事，带孩子熟悉环境\n\n关键是让孩子对上学充满期待。' },
        { kw: ['阅读', '看书', '绘本'], a: '培养阅读习惯：\n\n**3-4岁**：每天15分钟亲子共读\n**4-5岁**：延长到20分钟，读后讨论\n**5-6岁**：20-30分钟，开始自主阅读\n\n关键：固定时间、让孩子自己选书、家长做榜样。' }
    ];

    let reply = null;
    for (const rule of rules) {
        if (rule.kw.some(k => low.includes(k))) { reply = rule.a; break; }
    }
    if (!reply) reply = '抱歉，我没有理解您的问题。可以再详细一点吗？或者试试问关于吃饭、睡觉、情绪、教育等问题。';

    res.json({ reply, source: 'rule' });
});

// AI 绘本生成
app.post('/api/story', async (req, res) => {
    const { name, age, gender, hobbies, theme } = req.body;
    if (!name || !theme) return res.status(400).json({ error: '请填写名字和主题' });

    const aiStory = await callAI([
        { role: 'system', content: '你是一位优秀的儿童绘本作家。为3-6岁儿童创作300-500字的故事。语言简单生动，融入孩子名字和喜好。结尾温暖。不要暴力恐怖内容，不要说教。' },
        { role: 'user', content: `孩子：${name}，${age || '5'}岁，${gender || '男孩'}，爱好：${hobbies || '无'}，主题：${theme}。请创作专属故事。` }
    ]);

    if (aiStory) {
        return res.json({ story: aiStory, title: name + '的' + theme + '故事' });
    }

    // 降级模板
    const stories = {
        '睡前故事': `从前，有一个叫${name}的小${gender === '女' ? '女孩' : '男孩'}。\n\n每天晚上睡觉前，${name}最喜欢听故事。窗外飘进来一颗闪闪发光的小星星，轻轻落在${name}的手心里。\n\n"跟我来吧，"小星星说，"我带你去看看星星的世界。"\n\n${name}牵着小星星飞过了屋顶，来到了满天繁星的夜空。星星们轻轻唱着歌，用最柔软的星光给${name}盖了一床暖暖的光毯。\n\n"晚安，${name}。"月亮婆婆温柔地说。${name}微笑着进入了甜甜的梦乡。🌙`,
        '冒险探索': `从前，有一个叫${name}的小${gender === '女' ? '女孩' : '男孩'}。\n\n一天，${name}在后院发现了一个闪闪发光的盒子。打开后跳出一个会说话的小指南针："想不想去一个从未有人到过的地方？"\n\n${name}穿过花田，过了小溪，来到山顶。山顶上有一棵"勇气之树"，树上结满了彩色果实。\n\n"每颗果实都是一个小小的勇气。"${name}摘了一颗金色的果实放进口袋，心里暖暖的——原来勇气就在自己心里。🌟`,
    };

    const tpl = stories[theme] || stories['冒险探索'];
    res.json({ story: tpl(name, age, gender, hobbies), title: name + '的' + theme + '故事' });
});

function calculateAge(birthday) {
    if (!birthday) return '未知';
    const birth = new Date(birthday);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    if (months < 12) return months + '个月';
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    return remainMonths > 0 ? years + '岁' + remainMonths + '个月' : years + '岁';
}

// ========== 错误处理 ==========
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 注意：404 处理由 server.js 在最后添加

// ========== 启动 (当直接运行 api.js 时) ==========
if (require.main === module) {
    app.listen(PORT, () => {
        console.log('\n🤱 AI 宝贝 v2.0 已启动！');
        console.log(`   📡 端口: ${PORT}`);
        console.log(`   🤖 AI: ${AI_MODEL} ${AI_KEY ? '✅' : '❌ (未配置 API Key)'}`);
        console.log(`   💾 数据库: SQLite3\n`);
    });
}

module.exports = app;
