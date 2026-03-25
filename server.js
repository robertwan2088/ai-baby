const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 数据库初始化
const Database = require('better-sqlite3').Database;
const db = new Database('/home/ubuntu/projects/ai-baby/data/ai-baby.db');

// 图形验证码生成器
class Captcha {
    generate() {
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
        return { id: uuidv4(), code, svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` };
    }
}

// 简化的 HTML 单页应用
const SPA = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 宝贝 - 幼儿教育 AI 助手</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/element-plus@2.4.1/dist/index.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/element-plus@2.4.1/dist/index.full.min.js"></script>
</head>
<body>
    <div id="app"></div>
    <script>
        const { createApp, ref, computed, onMounted, reactive } = Vue;

        // 图形验证码组件
        const CaptchaInput = {
            template: \`
                <div class="captcha-container">
                    <img :src="captcha.svg" @click="refresh" class="captcha-image" />
                    <input v-model="code" placeholder="请输入验证码" maxlength="4" />
                </div>
            \`,
            props: [],
            setup() {
                const captcha = reactive({ id: '', code: '', svg: '' });
                const refresh = () => {
                    fetch('/api/captcha').then(r => r.json()).then(data => {
                        captcha.svg = data.svg;
                        captcha.id = data.id;
                        captcha.code = '';
                        this.$emit('verify', captcha.id, captcha.code);
                    });
                };
                onMounted(refresh);
                return { ...toRefs(captcha), refresh };
            }
        };

        const app = createApp({
            components: { CaptchaInput },
            setup() {
                const view = ref('login');
                const loginForm = reactive({ phone: '', captchaCode: '' });
                const registerForm = reactive({ phone: '', captchaCode: '' });
                const babyForm = reactive({ name: '', gender: '', birthday: '', favorite: '' });
                const user = ref(null);
                const babies = ref([]);
                const captchaRef = ref(null);
                const games = ref([]);
                const qa = ref([]);
                const adminView = ref('dashboard');

                const switchView = (v) => view.value = v;

                const handleLogin = () => {
                    if (!/^1\\d{10}$/.test(loginForm.phone)) {
                        ElementPlus.ElMessage.error('手机号格式不正确');
                        return;
                    }
                    fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: loginForm.phone, captcha_code: loginForm.captchaCode })
                    }).then(r => r.json()).then(res => {
                        if (res.success) {
                            localStorage.setItem('token', res.token);
                            localStorage.setItem('user', JSON.stringify(res.user));
                            user.value = res.user;
                            loadBabies();
                            switchView('home');
                        } else {
                            ElementPlus.ElMessage.error(res.error);
                        }
                    });
                };

                const handleRegister = () => {
                    fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: registerForm.phone, captcha_code: registerForm.captchaCode })
                    }).then(r => r.json()).then(res => {
                        if (res.success) {
                            ElementPlus.ElMessage.success('注册成功，请登录');
                            switchView('login');
                        } else {
                            ElementPlus.ElMessage.error(res.error);
                        }
                    });
                };

                const handleAddBaby = () => {
                    const token = localStorage.getItem('token');
                    fetch('/api/babies', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                        body: JSON.stringify(babyForm)
                    }).then(r => r.json()).then(res => {
                        if (res.success) {
                            ElementPlus.ElMessage.success('添加成功');
                            loadBabies();
                            babyForm.name = '';
                            babyForm.gender = '';
                            babyForm.birthday = '';
                            babyForm.favorite = '';
                        } else {
                            ElementPlus.ElMessage.error(res.error);
                        }
                    });
                };

                const loadBabies = () => {
                    const token = localStorage.getItem('token');
                    if (token) {
                        fetch('/api/babies', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        }).then(r => r.json()).then(res => {
                            babies.value = res.babies || [];
                        });
                    }
                };

                const loadGames = () => {
                    fetch('/api/games').then(r => r.json()).then(res => {
                        games.value = res.games || [];
                    });
                };

                const loadQA = () => {
                    fetch('/api/qa').then(r => r.json()).then(res => {
                        qa.value = res.qa || [];
                    });
                };

                onMounted(() => {
                    const savedUser = localStorage.getItem('user');
                    if (savedUser) {
                        user.value = JSON.parse(savedUser);
                        loadBabies();
                    }
                    loadGames();
                    loadQA();
                });

                return {
                    view, switchView, loginForm, registerForm, babyForm, user, babies, games, qa, adminView,
                    captchaRef, handleLogin, handleRegister, handleAddBaby
                };
            },
            template: \`
                <div id="app">
                    <el-container>
                        <el-header class="header">
                            <div class="logo">👶 AI 宝贝</div>
                            <div class="nav" v-if="user">
                                <el-button text @click="switchView('home')">首页</el-button>
                                <el-button text @click="switchView('games')">游戏</el-button>
                                <el-button text @click="switchView('qa')">问答</el-button>
                                <el-dropdown trigger="click">
                                    <span>{{ user.nickname }}</span>
                                    <template #dropdown>
                                        <el-dropdown-item @click="switchView('babies')">宝贝信息</el-dropdown-item>
                                        <el-dropdown-item @click="switchView('profile')">个人设置</el-dropdown-item>
                                        <el-dropdown-item divided @click="localStorage.clear(); location.reload()">登出</el-dropdown-item>
                                    </template>
                                </el-dropdown>
                            </div>
                            <div class="nav" v-else>
                                <el-button type="primary" @click="switchView('login')">登录</el-button>
                                <el-button @click="switchView('register')">注册</el-button>
                            </div>
                        </el-header>

                        <el-main>
                            <!-- 登录页面 -->
                            <div v-if="view === 'login'" class="auth-page">
                                <el-card class="auth-card">
                                    <template #header>
                                        <h2>登录</h2>
                                    </template>
                                    <el-form :model="loginForm" label-width="80px">
                                        <el-form-item label="手机号">
                                            <el-input v-model="loginForm.phone" placeholder="请输入11位手机号" maxlength="11" />
                                        </el-form-item>
                                        <el-form-item label="验证码">
                                            <captcha-input ref="captchaRef" @verify="handleLogin" />
                                        </el-form-item>
                                        <el-form-item>
                                            <el-button type="primary" @click="handleLogin" style="width: 100%">登录</el-button>
                                        </el-form-item>
                                    </el-form>
                                </el-card>
                            </div>

                            <!-- 注册页面 -->
                            <div v-if="view === 'register'" class="auth-page">
                                <el-card class="auth-card">
                                    <template #header>
                                        <h2>注册</h2>
                                    </template>
                                    <el-form :model="registerForm" label-width="80px">
                                        <el-form-item label="手机号">
                                            <el-input v-model="registerForm.phone" placeholder="请输入11位手机号" maxlength="11" />
                                        </el-form-item>
                                        <el-form-item label="验证码">
                                            <captcha-input ref="captchaRef" @verify="handleRegister" />
                                        </el-form-item>
                                        <el-form-item>
                                            <el-button type="primary" @click="handleRegister" style="width: 100%">注册</el-button>
                                        </el-form-item>
                                    </el-form>
                                </el-card>
                            </div>

                            <!-- 首页 -->
                            <div v-if="view === 'home'">
                                <h2 class="section-title">欢迎，{{ user?.nickname }}</h2>
                                <div class="baby-cards">
                                    <div v-for="baby in babies" :key="baby.id" class="baby-card" @click="switchView('babies')">
                                        <div class="baby-avatar">{{ baby.avatar || '👶' }}</div>
                                        <div class="baby-info">
                                            <h3>{{ baby.name }}</h3>
                                            <p>{{ baby.gender }} · {{ baby.favorite }}</p>
                                        </div>
                                    </div>
                                </div>
                                <el-empty v-if="babies.length === 0" description="还没有添加宝贝信息" />
                                <el-button type="primary" icon="Plus" @click="switchView('add-baby')">添加宝贝</el-button>
                            </div>

                            <!-- 添加/编辑宝贝 -->
                            <div v-if="view === 'add-baby' || view === 'babies'">
                                <el-card v-if="view === 'add-baby'" class="form-card">
                                    <template #header>
                                        <h2>{{ view === 'add-baby' ? '添加宝贝' : '编辑宝贝' }}</h2>
                                    </template>
                                    <el-form :model="babyForm" label-width="80px">
                                        <el-form-item label="名字">
                                            <el-input v-model="babyForm.name" placeholder="请输入宝贝名字" />
                                        </el-form-item>
                                        <el-form-item label="性别">
                                            <el-radio-group v-model="babyForm.gender">
                                                <el-radio label="男" value="男" />
                                                <el-radio label="女" value="女" />
                                            </el-radio-group>
                                        </el-form-item>
                                        <el-form-item label="生日">
                                            <el-date-picker v-model="babyForm.birthday" type="date" placeholder="选择日期" />
                                        </el-form-item>
                                        <el-form-item label="喜好">
                                            <el-input v-model="babyForm.favorite" placeholder="比如：恐龙、绘本" />
                                        </el-form-item>
                                        <el-form-item>
                                            <el-button @click="switchView('home')">取消</el-button>
                                            <el-button type="primary" @click="handleAddBaby">保存</el-button>
                                        </el-form-item>
                                    </el-form>
                                </el-card>

                                <div v-if="view === 'babies'">
                                    <h2 class="section-title">宝贝列表</h2>
                                    <div class="baby-cards">
                                        <div v-for="baby in babies" :key="baby.id" class="baby-card">
                                            <div class="baby-avatar">{{ baby.avatar || '👶' }}</div>
                                            <div class="baby-info">
                                                <h3>{{ baby.name }}</h3>
                                                <p>{{ baby.gender }} · {{ baby.favorite }}</p>
                                                <p class="baby-birthday">{{ baby.birthday }}</p>
                                            </div>
                                            <div class="baby-actions">
                                                <el-button size="small" @click="handleEditBaby(baby)">编辑</el-button>
                                                <el-button size="small" type="danger" @click="handleDeleteBaby(baby.id)">删除</el-button>
                                            </div>
                                        </div>
                                    </div>
                                    <el-button @click="switchView('add-baby')" icon="Plus">添加宝贝</el-button>
                                </div>
                            </div>

                            <!-- 游戏页面 -->
                            <div v-if="view === 'games'">
                                <h2 class="section-title">游戏</h2>
                                <div class="games-grid">
                                    <div v-for="game in games" :key="game.id" class="game-card">
                                        <div class="game-icon">{{ game.icon }}</div>
                                        <div class="game-info">
                                            <h3>{{ game.title }}</h3>
                                            <p>{{ game.description }}</p>
                                            <el-tag>{{ game.category }}</el-tag>
                                            <el-rate v-model="game.rating" disabled show-score />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 问答页面 -->
                            <div v-if="view === 'qa'">
                                <h2 class="section-title">常见问题</h2>
                                <div class="qa-list">
                                    <div v-for="item in qa" :key="item.id" class="qa-item">
                                        <div class="qa-question">
                                            <el-icon><QuestionFilled /></el-icon>
                                            {{ item.question }}
                                        </div>
                                        <div class="qa-answer">
                                            <el-icon><InfoFilled /></el-icon>
                                            {{ item.answer }}
                                        </div>
                                        <el-tag size="small">{{ item.category }}</el-tag>
                                    </div>
                                </div>
                            </div>

                            <!-- 管理后台 -->
                            <div v-if="view === 'admin'">
                                <el-menu :default-active="adminView" mode="horizontal" @select="adminView = $event">
                                    <el-menu-item index="dashboard">仪表盘</el-menu-item>
                                    <el-menu-item index="games">游戏管理</el-menu-item>
                                    <el-menu-item index="qa">问答管理</el-menu-item>
                                </el-menu>

                                <div v-if="adminView === 'dashboard'" class="admin-dashboard">
                                    <h2>后台数据统计</h2>
                                    <p>功能开发中...</p>
                                </div>
                                <div v-if="adminView === 'games'" class="admin-section">
                                    <h2>游戏管理</h2>
                                    <p>功能开发中...</p>
                                </div>
                                <div v-if="adminView === 'qa'" class="admin-section">
                                    <h2>问答管理</h2>
                                    <p>功能开发中...</p>
                                </div>
                            </div>
                        </el-main>
                    </el-container>
                </div>
            \`
        });

        app.use('/');
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        #app { min-height: 100vh; }
        
        .header { display: flex; justify-content: space-between; align-items: center; padding: 0 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
        .logo { font-size: 24px; font-weight: bold; }
        .nav { display: flex; gap: 10px; align-items: center; }
        
        .auth-page { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 60px); background: #f0f2f5; }
        .auth-card { width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .auth-card h2 { text-align: center; margin: 0; }
        
        .section-title { margin: 30px 0 20px; font-size: 28px; color: #333; }
        .baby-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; padding: 20px; }
        .baby-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; }
        .baby-card:hover { transform: translateY(-4px); }
        .baby-avatar { font-size: 48px; margin-bottom: 10px; }
        .baby-info h3 { margin: 0 0 5px; }
        .baby-info p { margin: 0; color: #666; }
        .baby-birthday { color: #999; font-size: 14px; }
        .baby-actions { margin-top: 15px; display: flex; gap: 10px; }
        
        .form-card { max-width: 600px; margin: 40px auto; }
        
        .games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
        .game-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; transition: transform 0.2s; }
        .game-card:hover { transform: translateY(-4px); }
        .game-icon { font-size: 48px; margin-bottom: 10px; }
        .game-info h3 { margin: 0 0 10px; }
        .game-info p { color: #666; margin: 0 0 10px; }
        
        .qa-list { padding: 20px; max-width: 800px; margin: 0 auto; }
        .qa-item { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .qa-question { font-weight: bold; margin-bottom: 10px; color: #333; display: flex; align-items: center; gap: 8px; }
        .qa-answer { color: #666; line-height: 1.6; display: flex; gap: 8px; }
        .qa-answer strong { color: #667eea; }
        
        .captcha-container { display: flex; align-items: center; gap: 10px; }
        .captcha-image { cursor: pointer; border: 1px solid #ddd; border-radius: 4px; }
        
        .admin-dashboard, .admin-section { padding: 40px; max-width: 1000px; margin: 0 auto; }
    </style>
</body>
</html>
`;

app.get('/api/captcha', (req, res) => {
    const captcha = new Captcha();
    res.json(captcha.generate());
});

app.post('/api/auth/login', (req, res) => {
    const { phone, captcha_code } = req.body;
    
    if (!/^1\\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确' });
    }

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) {
        return res.status(400).json({ error: '手机号未注册，请先注册' });
    }

    const token = jwt.sign({ userId: user.id, phone: user.phone }, 'ai-baby-secret', { expiresIn: '7d' });
    
    res.json({ success: true, token, user: { id: user.id, phone: user.phone, nickname: user.nickname } });
});

app.post('/api/auth/register', (req, res) => {
    const { phone, captcha_code } = req.body;

    if (!/^1\\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (existing) {
        return res.status(400).json({ error: '该手机号已注册' });
    }

    const result = db.prepare('INSERT INTO users (phone, nickname, avatar) VALUES (?, ?, ?)').run(
        phone,
        '用户' + phone.substring(7),
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone
    );

    const token = jwt.sign({ userId: result.lastInsertRowid, phone }, 'ai-baby-secret', { expiresIn: '7d' });
    
    res.json({ success: true, token, user: { id: result.lastInsertRowid, phone, nickname: '用户' + phone.substring(7) } });
});

app.get('/api/babies', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未登录' });

    try {
        const decoded = jwt.verify(token, 'ai-baby-secret');
        const babies = db.prepare('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC').all(decoded.userId);
        res.json({ success: true, babies });
    } catch (e) {
        res.status(401).json({ error: 'Token 无效' });
    }
});

app.post('/api/babies', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未登录' });

    try {
        const decoded = jwt.verify(token, 'ai-baby-secret');
        const { name, gender, birthday, favorite } = req.body;

        const result = db.prepare('INSERT INTO babies (user_id, name, gender, birthday, favorite) VALUES (?, ?, ?, ?, ?)').run(
            decoded.userId,
            name,
            gender,
            birthday,
            favorite || ''
        );

        db.prepare('UPDATE users SET baby_count = baby_count + 1 WHERE id = ?').run(decoded.userId);

        res.json({ success: true, baby: { id: result.lastInsertRowid, user_id: decoded.userId, name, gender, birthday, favorite } });
    } catch (e) {
        res.status(401).json({ error: 'Token 无效' });
    }
});

app.get('/api/games', (req, res) => {
    const games = db.prepare('SELECT * FROM games ORDER BY is_featured DESC, rating DESC').all();
    res.json({ success: true, games });
});

app.get('/api/qa', (req, res) => {
    const qa = db.prepare('SELECT * FROM qa ORDER BY id DESC').all();
    res.json({ success: true, qa });
});

app.get('/', (req, res) => {
    res.send(SPA);
});

app.listen(PORT, () => {
    console.log('\\n👶 AI 宝贝 v2.0 已启动！');
    console.log(`   端口: ${PORT}`);
    console.log(`   访问: http://localhost:${PORT}\\n`);
});
