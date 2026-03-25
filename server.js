// AI 宝贝 - 启动入口
require('dotenv').config();

// 初始化数据库
require('./server/init-db');

const path = require('path');
const express = require('express');
const PORT = process.env.PORT || 3001;

const app = require('./server/api');

// 生产环境：serve Vite 构建的静态文件 (在所有路由之前)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
}

// serve admin.html at /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 404 处理
app.use((req, res) => {
    if (req.accepts('html') && process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        res.status(404).json({ success: false, error: '接口不存在' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log('\n🤱 AI 宝贝 v2.0 已启动！');
    console.log(`   📡 端口: ${PORT}`);
    console.log(`   📱 前端: http://localhost:5173 (开发)`);
    console.log(`   🔧 后台: http://localhost:${PORT}/admin`);
    console.log(`   🤖 AI: ${process.env.AI_MODEL || 'deepseek-chat'} ${process.env.AI_API_KEY ? '✅' : '❌ (未配置 API Key)'}\n`);
});
