const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'client')));

const AI_URL = process.env.AI_API_URL || 'https://api.deepseek.com';
const AI_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

// ========== 育儿知识库 ==========
const QA = [
  { kw: ['吃饭','挑食','不吃饭','厌食','食欲'], a: '我理解你的担心，孩子挑食是很常见的。\n\n**几个实用建议：**\n\n1. **不要强迫**：让孩子自己决定吃什么吃多少\n2. **让孩子参与做饭**：一起买菜、洗菜、摆盘\n3. **固定用餐时间**：饭前1小时不吃零食\n4. **做好榜样**：家长也多样化饮食\n5. **让食物变有趣**：切成有趣形状\n\n如果持续一个月以上体重不增，建议看儿科。' },
  { kw: ['幼小衔接','入学','上小学','学前'], a: '幼小衔接建议从这几方面准备：\n\n**学习能力**：每天15-20分钟专注力训练（阅读、画画、拼图）\n\n**生活自理**：自己穿衣、系鞋带、整理书包\n\n**社交能力**：学会合作、分享、表达需求\n\n**心理准备**：多聊小学的事，带孩子熟悉环境\n\n不要焦虑，关键是让孩子对上学充满期待。' },
  { kw: ['发脾气','生气','哭闹','情绪','脾气'], a: '孩子发脾气是情绪表达还在发展中的正常表现。\n\n**当下：** 先接纳情绪，保持冷静，等孩子平静后再说\n\n**预防：** 识别触发点，提前预告，教情绪词汇\n\n4岁以上仍频繁激烈发脾气建议咨询专业人士。' },
  { kw: ['阅读','看书','绘本','读书'], a: '培养阅读习惯的建议：\n\n**3-4岁**：每天15分钟亲子共读，图多字少的绘本\n**4-5岁**：延长到20分钟，读后讨论\n**5-6岁**：20-30分钟，开始自主阅读\n\n关键：固定时间、让孩子自己选书、家长做榜样。' },
  { kw: ['睡觉','睡眠','晚睡','起床'], a: '各年龄段推荐睡眠：3-5岁10-13小时，5-6岁10-12小时。\n\n建议：固定作息、睡前仪式、避免屏幕、白天充分活动。' },
  { kw: ['打人','咬人','攻击'], a: '幼儿期打人较常见，通常是因为语言能力不够。\n\n当下：平静制止，关注被打的孩子，不要以暴制暴。\n\n长期：教替代行为、角色扮演、读相关绘本。' },
  { kw: ['认字','识字','拼音','写字'], a: '识字建议按年龄来：\n\n3-4岁：自然接触文字，不正式教\n4-5岁：游戏化识字，每天3-5个新字\n5-6岁：系统学习，每天3-5个，学正确笔顺\n\n关键：亲子共读是最好的识字方式。' },
  { kw: ['数学','算数','数数','加减'], a: '数学启蒙按年龄来：\n\n3-4岁：数到10-20，认识形状\n4-5岁：数到100，简单加法\n5-6岁：10以内加减法，认识时间\n\n在生活中学习效果最好。' },
];

// ========== 故事模板 ==========
const STORIES = {
  '睡前故事': (n,a,g,h) => `从前，有一个叫${n}的小${g==='女'?'女孩':'男孩'}，今年${a}岁了。\n\n每天晚上睡觉前，${n}最喜欢听妈妈讲故事。但今天，妈妈说："${n}，今晚想不想去星星的世界看看呀？"\n\n${n}的眼睛一下子亮了起来。就在这时，窗外飘进来一颗闪闪发光的小星星，轻轻落在了${n}的手心里。\n\n"跟我来吧，"小星星说，"我带你去看看我的家。"\n\n${n}牵着小星星的手，飞过了屋顶，飞过了云层，来到了满天繁星的夜空。星星们都出来欢迎${n}了，排成一排，轻轻地唱着歌。\n\n${n}在星星们的歌声中，慢慢地闭上了眼睛。星星们用最柔软的星光给${n}盖了一床暖暖的光毯。\n\n"晚安，${n}。"月亮婆婆温柔地说，"明天又是美好的一天。"\n\n${n}微笑着进入了甜甜的梦乡。🌙`,
  '冒险探索': (n,a,g,h) => `从前，有一个叫${n}的小${g==='女'?'女孩':'男孩'}，今年${a}岁。${n}最喜欢探险${h?'，尤其是'+h:''}。\n\n有一天，${n}在后院的大树下发现了一个闪闪发光的盒子。打开后跳出一个会说话的小指南针："你想不想去一个从未有人到过的地方？"\n\n于是${n}出发了。穿过唱歌的花田，踩着石头过了小溪，最后来到了山顶。\n\n山顶上有一棵美丽的"勇气之树"，树上结满了彩色的果实。\n\n"每颗果实都是一个小小的勇气，"小指南针说，"你今天的冒险，让这棵树又长出了新的果实。"\n\n${n}摘了一颗金色的果实放进口袋。回家的路上，${n}心里暖暖的——原来勇气就在自己心里。🌟`,
  '友谊成长': (n,a,g,h) => `新学期第一天，${n}有点想妈妈。这时一个叫小豆的小朋友走过来说："你好呀，要不要一起玩积木？"\n\n两个人一起搭了一座又高又漂亮的城堡。${n}说："这是我们两个的友谊城堡！"\n\n下午一起画画，${n}画了最喜欢的${h||''}恐龙，小豆画了一道彩虹，两幅画连成了一幅大画。\n\n放学时小豆说："明天我们再一起玩好不好？"\n\n"${n}用力地点点头。回家的路上跟妈妈说："妈妈，我今天交到了一个好朋友！"\n\n原来交朋友这么简单，只要勇敢地说一声"你好"就行了。🤝`,
  '学习发现': (n,a,g,h) => `${n}是一个充满好奇心的小${g==='女'?'女孩':'男孩'}，今年${a}岁。\n\n${n}最喜欢问"为什么"。有一天在花园里发现了一只毛毛虫。\n\n妈妈说："毛毛虫虽然走得慢，但每天都很努力。等到有一天，它就会变成一只漂亮的蝴蝶！"\n\n${n}决定每天来看。第一天吃叶子，第三天变胖了，第五天裹在蛹里不动了。\n\n又过了好几天，蛹动了！一只漂亮的蝴蝶慢慢地爬了出来，晒干翅膀后飞了起来！\n\n"${n}开心极了：原来最亮的光，一直都在自己心里。🌟`,
  '勇气故事': (n,a,g,h) => `${n}有一个小秘密——怕黑。\n\n一天晚上妈妈忘了留小夜灯。${n}鼓起勇气掀开被角，发现窗外是满天繁星，一闪一闪像撒了满地的宝石。\n\n一颗小星星特别亮地闪了一下，好像在说"你好呀！"${n}不害怕了，趴在窗台数星星，数着数着就睡着了。\n\n从那以后${n}不怕黑了。因为${n}知道，黑暗之后就是最美丽的星空。\n\n每当害怕的时候，${n}就对自己说："勇敢不是不害怕，而是害怕了还愿意去发现。"🌟`,
};

async function callAI(messages) {
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

// ========== 路由 ==========

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'AI 宝贝', ai: AI_MODEL }));

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: '请输入问题' });

  const aiReply = await callAI([
    { role: 'system', content: '你是一位专业的幼儿教育顾问，拥有10年以上的儿童教育和心理学经验。回答要求：语气温和耐心，给出2-3条具体可操作的建议，200-400字。先共情再给建议，涉及健康问题建议就医。' },
    { role: 'user', content: message }
  ]);

  if (aiReply) return res.json({ reply: aiReply });

  // 降级到模拟
  const low = message.toLowerCase();
  let reply = null;
  for (const q of QA) { if (q.kw.some(k => low.includes(k))) { reply = q.a; break; } }
  if (!reply) reply = `关于"${message.substring(0,20)}..."，建议：1.尊重孩子节奏 2.多观察少干预 3.保持耐心 4.以身作则。提供更多细节我可以给更针对性的建议。`;
  res.json({ reply });
});

app.post('/api/story', async (req, res) => {
  const { name, age, gender, hobbies, theme } = req.body;
  if (!name || !theme) return res.status(400).json({ error: '请填写名字和主题' });

  const aiStory = await callAI([
    { role: 'system', content: '你是一位优秀的儿童绘本作家。为3-6岁儿童创作300-500字的故事。语言简单生动，融入孩子名字和喜好。结尾温暖。不要暴力恐怖内容，不要说教。' },
    { role: 'user', content: `孩子：${name}，${age}岁，${gender}，爱好：${hobbies||'无'}，主题：${theme}。请创作专属故事。` }
  ]);

  if (aiStory) return res.json({ story: aiStory, title: name + '的' + theme + '故事' });

  const tpl = STORIES[theme] || STORIES['冒险探索'];
  res.json({ story: tpl(name, age || '5', gender || '男', hobbies || ''), title: name + '的' + theme + '故事' });
});

app.post('/api/tts', (req, res) => res.json({ supported: false }));

app.listen(PORT, () => {
  console.log('\n🤱 AI 宝贝 已启动！');
  console.log('   http://localhost:' + PORT);
  console.log('   AI: ' + AI_MODEL + ' ✅\n');
});
