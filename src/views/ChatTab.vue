<template>
  <div class="page">
    <div class="status-bar"><span>16:30</span><span>📶 🔋 87%</span></div>
    <div style="padding:16px 20px 8px;background:#fff;border-bottom:1px solid #f0f0f0;flex-shrink:0">
      <h2 style="font-size:20px;color:#333">💬 育儿问答</h2>
      <p style="font-size:12px;color:#999;margin-top:4px">AI 专业顾问为你解答育儿问题</p>
    </div>

    <div class="chat-messages scroll-area" ref="msgContainer">
      <div class="msg ai">
        <div class="avatar">🤖</div>
        <div class="bubble">你好！我是 AI 育儿顾问 👋<br><br>有什么育儿问题都可以问我~<br>比如孩子的饮食、学习、情绪等。</div>
      </div>
      <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
        <div class="avatar">{{ m.role === 'ai' ? '🤖' : '😊' }}</div>
        <div class="bubble" v-html="formatMsg(m.content)"></div>
      </div>
      <div v-if="loading" class="msg ai">
        <div class="avatar">🤖</div>
        <div class="bubble typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
    </div>

    <div class="quick-questions" v-if="messages.length === 0 && !loading">
      <div class="label">🔍 常见问题</div>
      <div class="quick-btn" @click="sendQuick('5岁孩子不爱吃饭怎么办？')">5岁孩子不爱吃饭怎么办？</div>
      <div class="quick-btn" @click="sendQuick('幼小衔接需要提前学什么？')">幼小衔接需要提前学什么？</div>
      <div class="quick-btn" @click="sendQuick('孩子经常发脾气怎么办？')">孩子经常发脾气怎么办？</div>
      <div class="quick-btn" @click="sendQuick('怎么培养孩子的阅读习惯？')">怎么培养孩子的阅读习惯？</div>
    </div>

    <div class="chat-input">
      <input placeholder="输入你的育儿问题..." v-model="input" @keyup.enter="sendMessage">
      <button class="send-btn" @click="sendMessage">➤</button>
    </div>

    <div class="tab-bar">
      <button class="tab-item" @click="$navigate('/home')"><span class="icon">🏠</span><span>首页</span></button>
      <button class="tab-item active" @click="$navigate('/chat')"><span class="icon">💬</span><span>问答</span></button>
      <button class="tab-item" @click="$navigate('/book')"><span class="icon">📖</span><span>绘本</span></button>
      <button class="tab-item" @click="$navigate('/profile')"><span class="icon">👤</span><span>我的</span></button>
    </div>
  </div>
</template>

<script>
import { ref, nextTick } from 'vue';
import { chat } from '../api/index';
import store from '../stores/index';

export default {
  setup() {
    const messages = ref([]);
    const input = ref('');
    const loading = ref(false);
    const msgContainer = ref(null);

    const formatMsg = (text) => {
      if (!text) return '';
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    };

    const scrollToBottom = () => {
      nextTick(() => {
        if (msgContainer.value) {
          msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
        }
      });
    };

    const sendQuick = (text) => {
      input.value = text;
      sendMessage();
    };

    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text || loading.value) return;

      messages.value.push({ role: 'user', content: text });
      input.value = '';
      scrollToBottom();

      loading.value = true;
      try {
        const babyId = store.babies.length > 0 ? store.babies[0].id : undefined;
        const res = await chat({ message: text, baby_id: babyId });
        messages.value.push({ role: 'ai', content: res.reply || '抱歉，我暂时无法回答这个问题。' });
      } catch (e) {
        messages.value.push({ role: 'ai', content: '抱歉，出了点问题，请稍后再试。' });
      }
      loading.value = false;
      scrollToBottom();
    };

    return { messages, input, loading, msgContainer, formatMsg, sendQuick, sendMessage };
  },
};
</script>

<style scoped>
.chat-messages {
  flex: 1; padding: 16px; overflow-y: auto; background: #F8F9FA;
}
.chat-messages::-webkit-scrollbar { display: none; }

.msg { display: flex; margin-bottom: 16px; gap: 10px; }
.msg.ai { flex-direction: row; }
.msg.user { flex-direction: row-reverse; }

.avatar {
  width: 36px; height: 36px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.msg.ai .avatar { background: #FFECD2; }
.msg.user .avatar { background: #D4E5FF; }

.bubble {
  max-width: 75%; padding: 12px 16px; border-radius: 18px;
  font-size: 15px; line-height: 1.6; word-break: break-word;
}
.msg.ai .bubble {
  background: #fff; color: #333; border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.msg.user .bubble {
  background: #54A0FF; color: #fff; border-bottom-right-radius: 4px;
}

.typing { display: flex; gap: 4px; padding: 16px 20px; }
.dot {
  width: 8px; height: 8px; border-radius: 50%; background: #999;
  animation: bounce 1.4s ease infinite;
}
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes bounce {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.quick-questions {
  padding: 8px 16px 12px; background: #F8F9FA;
  border-top: 1px solid #f0f0f0; flex-shrink: 0;
}
.label { font-size: 12px; color: #999; margin-bottom: 8px; }
.quick-btn {
  display: inline-block; background: #fff; border: 1px solid #E8E8E8;
  border-radius: 20px; padding: 8px 14px; font-size: 13px; color: #666;
  cursor: pointer; margin: 3px;
}
.quick-btn:active { background: #54A0FF; color: #fff; border-color: #54A0FF; }

.chat-input {
  padding: 10px 16px; background: #fff; border-top: 1px solid #f0f0f0;
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}
.chat-input input {
  flex: 1; height: 40px; border-radius: 20px; border: 1px solid #e0e0e0;
  padding: 0 16px; font-size: 15px; outline: none; background: #F8F9FA;
}
.chat-input input:focus { border-color: #54A0FF; background: #fff; }
.send-btn {
  width: 40px; height: 40px; border-radius: 20px; background: #54A0FF;
  border: none; color: #fff; font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
</style>
