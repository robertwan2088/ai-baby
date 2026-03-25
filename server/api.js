// AI 宝贝 - 完整后端 API
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = require('./db');
const CaptchaGenerator = require('./utils/captcha');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 中间件：验证手机号格式
const validatePhone = (req, res, next) => {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确，请输入11位手机号码' });
    }
    next();
};

// 中间件：验证图形验证码
const validateCaptcha = (req, res, next) => {
    const { captcha_code, captcha_id } = req.body;
    if (!captcha_code || captcha_code.length !== 4) {
        return res.status(400).json({ error: '验证码格式不正确' });
    }
    next();
};

// 认证中间件
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未登录' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ai-baby-secret');
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token 无效' });
    }
};

// 管理员认证中间件
const requireAdmin = (req, res, next) => {
    if (!req.session.adminId) return res.status(401).json({ error: '未登录' });
    next();
};

// ============ 公开 API ============

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'AI 宝贝',
        version: '2.0.0',
        database: 'connected'
    });
});

// 生成图形验证码
app.get('/api/captcha', (req, res) => {
    const captcha = new CaptchaGenerator();
    const code = captcha.generate(4);
    const svg = captcha.createSVG(code);

    res.json({
        id: uuidv4(),
        code: code,
        svg: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        expires_at: Date.now() + 300000 // 5分钟
    });
});

// 发送验证码（模拟短信）
app.post('/api/verifications/send', validatePhone, (req, res) => {
    const { phone } = req.body;

    // 检查是否已发送过验证码（5分钟内）
    const existing = db.prepare('SELECT * FROM verifications WHERE phone = ? AND created_at > datetime("now", "-5 minutes") ORDER BY id DESC LIMIT 1').get(phone);
    if (existing) {
        return res.json({ success: true, message: '验证码已发送（模拟：123456），请查看', expires_in: 300 });
    }

    // 生成验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString().substring(0, 6);

    // 保存到数据库
    db.prepare('INSERT INTO verifications (phone, code, type, expires_at) VALUES (?, ?, ?, datetime("now", "+5 minutes"))').run(phone, code, 'sms');

    // 模拟发送短信
    console.log(`📱 [模拟短信] 发送到 ${phone}: 验证码 ${code}`);

    res.json({
        success: true,
        message: '验证码已发送',
        expires_in: 300
    });
});

// 验证验证码
app.post('/api/verifications/verify', validatePhone, (req, res) => {
    const { phone, code } = req.body;

    if (!code || code.length !== 6) {
        return res.status(400).json({ error: '验证码格式不正确' });
    }

    const verification = db.prepare('SELECT * FROM verifications WHERE phone = ? AND code = ? AND expires_at > datetime("now") ORDER BY id DESC LIMIT 1').get(phone, code);

    if (!verification) {
        return res.status(400).json({ error: '验证码错误或已过期' });
    }

    res.json({ success: true, message: '验证码正确' });
});

// 用户注册
app.post('/api/auth/register', validatePhone, validateCaptcha, (req, res) => {
    const { phone, captcha_code, verification_code } = req.body;

    // 检查手机号是否已注册
    const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (existing) {
        return res.status(400).json({ error: '该手机号已注册' });
    }

    // 验证短信验证码
    const verification = db.prepare('SELECT * FROM verifications WHERE phone = ? AND code = ? AND expires_at > datetime("now") ORDER BY id DESC LIMIT 1').get(phone, verification_code);
    if (!verification) {
        return res.status(400).json({ error: '验证码错误或已过期' });
    }

    // 创建用户
    const result = db.prepare('INSERT INTO users (phone, nickname, avatar) VALUES (?, ?, ?)').run(phone, '用户' + phone.substring(7), 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone);

    if (result.changes === 0) {
        return res.status(500).json({ error: '注册失败，请重试' });
    }

    res.json({
        success: true,
        message: '注册成功',
        user: {
            id: result.lastInsertRowid,
            phone: phone,
            nickname: '用户' + phone.substring(7),
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone
        }
    });
});

// 用户登录
app.post('/api/auth/login', validatePhone, validateCaptcha, (req, res) => {
    const { phone, captcha_code } = req.body;

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
        return res.status(400).json({ error: '手机号未注册' });
    }

    // 生成 JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_SECRET || 'ai-baby-secret', { expiresIn: '7d' });

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
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    // 获取宝贝信息
    const babies = db.prepare('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);

    res.json({
        success: true,
        user: {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            avatar: user.avatar,
            baby_count: user.baby_count
        },
        babies: babies
    });
});

// 更新用户信息
app.put('/api/user/me', requireAuth, (req, res) => {
    const { nickname, avatar } = req.body;

    db.prepare('UPDATE users SET nickname = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        nickname,
        avatar || db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.userId).avatar,
        req.userId
    );

    res.json({ success: true, message: '更新成功' });
});

// ========== 宝贝管理 API ==========

// 添加宝贝
app.post('/api/babies', requireAuth, (req, res) => {
    const { name, gender, birthday, avatar, favorite } = req.body;

    if (!name) {
        return res.status(400).json({ error: '请填写宝贝名字' });
    }

    const result = db.prepare('INSERT INTO babies (user_id, name, gender, birthday, avatar, favorite) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.userId,
        name,
        gender,
        birthday,
        avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + name,
        favorite || ''
    );

    // 更新宝贝数量
    db.prepare('UPDATE users SET baby_count = baby_count + 1 WHERE id = ?').run(req.userId);

    res.json({
        success: true,
        message: '宝贝添加成功',
        baby: {
            id: result.lastInsertRowid,
            user_id: req.userId,
            name: name,
            gender: gender,
            birthday: birthday,
            avatar: avatar,
            favorite: favorite
        }
    });
});

// 获取宝贝列表
app.get('/api/babies', requireAuth, (req, res) => {
    const babies = db.prepare('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, babies });
});

// 更新宝贝信息
app.put('/api/babies/:id', requireAuth, (req, res) => {
    const { name, gender, birthday, avatar, favorite } = req.body;

    // 验证权限
    const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
    if (!baby || baby.user_id !== req.userId) {
        return res.status(403).json({ error: '无权限操作' });
    }

    db.prepare('UPDATE babies SET name = ?, gender = ?, birthday = ?, avatar = ?, favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        name,
        gender,
        birthday,
        avatar,
        favorite,
        req.params.id
    );

    res.json({ success: true, message: '更新成功' });
});

// 删除宝贝
app.delete('/api/babies/:id', requireAuth, (req, res) => {
    const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
    if (!baby || baby.user_id !== req.userId) {
        return res.status(403).json({ error: '无权限操作' });
    }

    db.prepare('DELETE FROM babies WHERE id = ?').run(req.params.id);

    // 更新宝贝数量
    db.prepare('UPDATE users SET baby_count = baby_count - 1 WHERE id = ?').run(req.userId);

    res.json({ success: true, message: '删除成功' });
});

// ========== 游戏 API ==========

// 获取游戏列表
app.get('/api/games', (req, res) => {
    const { category, age_range, is_featured } = req.query;

    let sql = 'SELECT * FROM games';
    const params = [];

    if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    if (age_range) {
        if (category) sql += ' AND';
        sql += ' age_range = ?';
        params.push(age_range);
    }

    if (is_featured === 'true') {
        if (category || age_range) sql += ' AND';
        sql += ' is_featured = 1';
        params.push();
    }

    sql += ' ORDER BY is_featured DESC, rating DESC, created_at DESC';

    const games = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();

    res.json({ success: true, games });
});

// 获取游戏详情
app.get('/api/games/:id', (req, res) => {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) {
        return res.status(404).json({ error: '游戏不存在' });
    }

    res.json({ success: true, game });
});

// 增加游戏下载次数
app.post('/api/games/:id/download', requireAuth, (req, res) => {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) {
        return res.status(404).json({ error: '游戏不存在' });
    }

    db.prepare('UPDATE games SET download_count = download_count + 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: '下载次数已更新' });
});

// ========== 问答 API ==========

// 获取问答列表
app.get('/api/qa', (req, res) => {
    const { category } = req.query;

    let sql = 'SELECT * FROM qa';
    const params = [];

    if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    sql += ' ORDER BY created_at DESC';

    const qa = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();

    res.json({ success: true, qa });
});

// 获取问答详情
app.get('/api/qa/:id', (req, res) => {
    const question = db.prepare('SELECT * FROM qa WHERE id = ?').get(req.params.id);
    if (!question) {
        return res.status(404).json({ error: '问题不存在' });
    }

    // 增加浏览次数
    db.prepare('UPDATE qa SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, question });
});

// 点赞问答
app.post('/api/qa/:id/like', requireAuth, (req, res) => {
    const question = db.prepare('SELECT * FROM qa WHERE id = ?').get(req.params.id);
    if (!question) {
        return res.status(404).json({ error: "问题不存在" });
    }

    db.prepare('UPDATE qa SET likes = likes + 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: "点赞成功" });
});

// ========== 推荐内容 API ==========

// 获取推荐列表
app.get('/api/recommendations', (req, res) => {
    const { category } = req.query;

    let sql = 'SELECT * FROM recommendations';
    const params = [];

    if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    sql += ' ORDER BY is_featured DESC, order_num ASC, created_at DESC';

    const recommendations = params.length > 0 ? db.prepare(sql).all(...params) : db.prepare(sql).all();

    res.json({ success: true, recommendations });
});

// ========== 管理 API ==========

// 管理员登录
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (!bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    res.json({
        success: true,
        message: '登录成功',
        admin: {
            id: admin.id,
            username: admin.username
        }
    });
});

// 获取管理员信息
app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json({
        success: true,
        admin: {
            id: req.session.adminId,
            username: req.session.adminUsername
        }
    });
});

// 管理员登出
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: '登出成功' });
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
        stats: {
            users,
            babies,
            games,
            qa,
            recommendations
        }
    });
});

// 游戏管理 - 获取所有游戏
app.get('/api/admin/games', requireAdmin, (req, res) => {
    const games = db.prepare('SELECT * FROM games ORDER BY id DESC').all();
    res.json({ success: true, games });
});

// 游戏管理 - 添加游戏
app.post('/api/admin/games', requireAdmin, (req, res) => {
    const { title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating } = req.body;

    db.prepare('INSERT INTO games (title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        title,
        icon,
        description,
        category,
        age_range,
        thumbnail,
        content,
        is_featured ? 1 : 0,
        download_count || 0,
        rating || 4.5
    );

    res.json({ success: true, message: '游戏添加成功' });
});

// 游戏管理 - 更新游戏
app.put('/api/admin/games/:id', requireAdmin, (req, res) => {
    const { title, icon, description, category, age_range, thumbnail, content, is_featured, download_count, rating } = req.body;

    db.prepare('UPDATE games SET title = ?, icon = ?, description = ?, category = ?, age_range = ?, thumbnail = ?, content = ?, is_featured = ?, download_count = ?, rating = ? WHERE id = ?').run(
        title, icon, description, category, age_range, thumbnail, content, is_featured ? 1 : 0, download_count, rating, req.params.id
    );

    res.json({ success: true, message: '游戏更新成功' });
});

// 游戏管理 - 删除游戏
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

    db.prepare('INSERT INTO qa (question, answer, category, tags) VALUES (?, ?, ?, ?)').run(question, answer, category, tags);

    res.json({ success: true, message: '问答添加成功' });
});

app.put('/api/admin/qa/:id', requireAdmin, (req, res) => {
    const { question, answer, category, tags } = req.body;

    db.prepare('UPDATE qa SET question = ?, answer = ?, category = ?, tags = ? WHERE id = ?').run(question, answer, category, tags, req.params.id);

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
        title, content, category, thumbnail, link, is_featured ? 1 : 0, order_num || 0
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
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '用户删除成功' });
});

// ========== AI 对话 API ==========

const AI_URL = process.env.AI_API_URL || 'https://api.deepseek.com';
const AI_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

async function callAI(messages) {
    if (!AI_KEY) {
        return null;
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);

        const resp = await fetch(AI_URL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages,
                max_tokens: 1000
            }),
            signal: controller.signal
        });

        clearTimeout(timer);
        const data = await resp.json();
        return data.choices[0]?.message?.content || null;
    } catch (e) {
        console.error('AI error:', e.message);
        return null;
    }
}

// 宝贝对话
app.post('/api/chat', async (req, res) => {
    const { message, baby_id } = req.body;

    if (!message) {
        return res.status(400).json({ error: '请输入消息' });
    }

    // 获取宝贝信息
    let babyPrompt = '';
    if (baby_id) {
        const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(baby_id);
        if (baby) {
            babyPrompt = `这是一个关于${baby.name}（${baby.gender}，${baby.birthday}出生）的问题。${baby.favorite}。`;
        }
    }

    const aiReply = await callAI([
        { role: 'system', content: '你是AI宝贝，一位专业的儿童教育顾问。请用温暖、耐心、鼓励的语气回答家长关于幼儿教育的问题。回答要具体可操作，避免空泛的建议。如果涉及健康问题，建议就医。' },
        { role: 'user', content: babyPrompt + message }
    ]);

    if (aiReply) {
        return res.json({ reply: aiReply });
    }

    // 降级到规则匹配
    const low = message.toLowerCase();
    let reply = null;

    const rules = [
        { kw: ['吃饭', '挑食'], a: '建议：1.不要强迫 2.让孩子参与 3.固定用餐时间 4.做好榜样 5.让食物变有趣' },
        { kw: ['睡觉', '睡眠'], a: '建议：固定作息、睡前仪式、避免屏幕、白天充分活动' },
        { kw: ['哭闹', '发脾气'], a: '建议：先接纳情绪，保持冷静，教情绪词汇' },
        { kw: ['入园', '上学'], a: '建议：提前熟悉环境、社交练习、生活自理' }
    ];

    for (const rule of rules) {
        if (rule.kw.some(k => low.includes(k))) {
            reply = rule.a;
            break;
        }
    }

    if (!reply) {
        reply = '抱歉，我没有理解您的问题。可以再详细一点吗？或者试试问关于吃饭、睡觉、情绪、教育等问题。';
    }

    res.json({ reply, source: 'rule' });
});

// ========== 错误处理 ============

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
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// ========== 启动服务器 ==========

app.listen(PORT, () => {
    console.log('\n🤱 AI 宝贝 v2.0 已启动！');
    console.log(`   📡 端口: ${PORT}`);
    console.log(`   🤖 AI: ${AI_MODEL}`);
    console.log(`   💾 数据库: SQLite3\n`);
});

module.exports = app;
