# AI 宝贝

幼儿教育 AI 助手 Web App

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
npm start

# 3. 打开浏览器访问
# http://localhost:3000
```

## 配置真实 AI（可选）

设置环境变量后 AI 会调用真实接口，否则使用内置模拟：

```bash
# OpenAI 兼容格式
export AI_API_URL=https://api.openai.com/v1
export AI_API_KEY=sk-xxxxx
export AI_MODEL=gpt-3.5-turbo

# 或使用国产模型（如智谱 GLM）
export AI_API_URL=https://open.bigmodel.cn/api/paas/v4
export AI_API_KEY=your_key
export AI_MODEL=glm-4

npm start
```

## 项目结构

```
ai-baby/
├── client/           # 前端文件
│   └── index.html    # 主页面（所有页面 + 样式 + 交互）
├── server/           # 后端
│   └── index.js      # Express API 服务
├── package.json
└── README.md
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/health | GET | 健康检查 |
| /api/chat | POST | 育儿问答（body: {message}） |
| /api/story | POST | 绘本生成（body: {name,age,gender,hobbies,theme}） |
| /api/tts | POST | 语音合成（预留） |
