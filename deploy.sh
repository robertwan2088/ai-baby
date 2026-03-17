#!/bin/bash
set -e
echo "🤱 AI 宝贝 部署脚本"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "📥 拉取代码..."
git pull origin main

echo "📦 安装依赖..."
npm install --production

echo "🤖 设置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件填入 API Key"
    echo "   nano .env"
fi

echo "🔄 重启服务..."
pm2 restart ai-baby 2>/dev/null || pm2 start server/index.js --name ai-baby
pm2 save

echo "✅ 部署完成！"
echo "   访问: http://$(curl -s ifconfig.me)"
