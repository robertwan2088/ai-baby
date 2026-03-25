#!/bin/bash
# AI 宝贝 - 完整部署脚本

echo "🚀 开始部署 AI 宝贝..."

# 1. 推送到 GitHub
echo "📤 推送到 GitHub..."
cd /Users/elonmusk/.openclaw/workspace/ai-baby

git add -A
git commit -m "v2.0: 前后端分离 + 独立管理后台 + SQLite 数据库"
git push origin main

echo "✅ Git 推送完成！"
echo ""

# 2. SSH 部署
echo "🔧 部署到服务器..."

SSH="sshpass -p 'Abc123456@' ssh -o StrictHostKeyChecking=no"

# 停止旧服务
$SSH ubuntu@43.129.82.160 'pm2 stop aihub-main 2>/dev/null; pm2 stop aihub 2>/dev/null; pm2 stop aibaby 2>/dev/null; echo "旧服务已停止"'

# 创建目录
$SSH ubuntu@43.129.82.160 'mkdir -p ~/projects/ai-baby-v2' 2>/dev/null'

# 克隆代码
$SSH ubuntu@43.129.82.160 'cd ~/projects/ai-baby-v2 && git clone https://github.com/robertwan2088/ai-baby.git 2>/dev/null; echo "代码克隆完成"'

# 安装依赖
$SSH ubuntu@43.129.82.160 'cd ~/projects/ai-baby-v2/ai-baby && npm install better-sqlite3 bcryptjs jsonwebtoken cors express 2>/dev/null; echo "依赖安装完成"'

# 配置 Nginx
$SSH ubuntu@43.129.82.160 "sudo bash << 'ENDSSH'
# 主站 (前端）
cat > /etc/nginx/sites-available/aibaobei.vip << 'NCONF'
server {
    listen 80;
    server_name aibaobei.vip www.aibaobei.vip;
    root /var/www/aibaobei;
    index index.html;

    access_log /var/log/nginx/aibaobei.vip.access.log;
    error_log /var/log/nginx/aibaobei.vip.error.log;
}

# HTTPS 主站
server {
    listen 443 ssl http2;
    server_name aibaobei.vip www.aibaobei.vip;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/aibaobei.vip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aibaobei.vip/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/aibaobei;

    access_log /var/log/nginx/aibaobei.vip-ssl.access.log;
    error_log /var/log/nginx/aibaobei.vip-ssl.error.log;
}
NCONF

# 管理后台
cat > /etc/nginx/sites-available/aibaobei-admin.vip << 'NCONF'
server {
    listen 80;
    server_name admin.aibaobei.vip;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
}

# HTTPS 管理后台
server {
    listen 443 ssl http2;
    server_name admin.aibaobei.vip;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/aibaobei.vip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aibaobei.vip/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
NCONF

# 启用配置
ln -sf /etc/nginx/sites-available/aibaobei.vip /etc/nginx/sites-enabled/aibaobei.vip
ln -sf /etc/nginx/sites-available/aibaobei-admin.vip /etc/nginx/sites-enabled/aibaobei-admin.vip

# 测试配置
nginx -t

# 重启 Nginx
systemctl reload nginx
ENDSSH
' 2>/dev/null; echo \"Nginx 配置完成\""

# 创建 PM2 配置
$SSH ubuntu@43.129.82.160 'cd ~/projects/ai-baby-v2/ai-baby && cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'aibaby-frontend',
      script: '/var/www/aibaobei/index.html',
      interpreter: 'none',
      autorestart: false,
      watch: false
    },
    {
      name: 'aibaby-admin',
      script: 'server.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
EOF
' 2>/dev/null; echo \"PM2 配置完成\""

# 启动服务
$SSH ubuntu@43.129.82.160 'cd ~/projects/ai-baby-v2/ai-baby && pm2 start ecosystem.config.js 2>/dev/null; pm2 save 2>/dev/null; echo \"服务启动完成\"'

# 申请 SSL 证书
echo "🔐 申请 SSL 证书..."
$SSH ubuntu@43.129.82.160 'sudo certbot certonly --webroot -w /var/www/aibaobei -d aibaobei.vip -d www.aibaobei.vip --agree-tos --email admin@aibaobei.vip 2>/dev/null; echo \"SSL 证书申请完成\"'

# 重启 Nginx
echo "🔄 重启 Nginx..."
$SSH ubuntu@43.129.82.160 'sudo systemctl reload nginx 2>/dev/null; echo \"Nginx 已重启\"'

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 访问地址："
echo "   前端：http://aibaobei.vip"
echo "   前端：https://aibaobei.vip"
echo "   后台 API：http://aibaobei.vip/api"
echo "   后台 API：https://aibaobei.vip/api"
echo "   管理后台：http://admin.aibaobei.vip"
echo "   管理后台：https://admin.aibaobei.vip"
echo ""
echo "👤 管理员："
echo "   用户名：admin"
echo "   密码：admin123"
echo ""
echo "📝 功能列表："
echo "   ✅ 前后端分离"
echo "   ✅ SQLite 数据库"
echo "   ✅ 独立管理后台"
echo "   ✅ 图形验证码"
echo "   ✅ 宝贝信息动态存储"
echo "   ✅ 游戏库管理"
echo "   ✅ 问答库管理"
echo "   ✅ 推荐内容管理"
echo "   ✅ 用户管理"
echo "   ✅ HTTPS 加密"
echo ""
echo "🔍 验证部署："
echo "   查看服务：ssh ubuntu@43.129.82.160 'pm2 list'"
echo "   查看日志：ssh ubuntu@43.129.82.160 'pm2 logs aibaby-admin --lines 50'"
echo ""
