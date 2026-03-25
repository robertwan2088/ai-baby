<template>
  <div class="page">
    <div class="status-bar"><span>16:30</span><span>📶 🔋 87%</span></div>
    <div style="padding:16px 20px 8px;background:#fff;border-bottom:1px solid #f0f0f0;flex-shrink:0">
      <h2 style="font-size:20px;color:#333">📖 AI 绘本</h2>
      <p style="font-size:12px;color:#999;margin-top:4px">为你的孩子创作专属故事</p>
    </div>

    <div class="scroll-area" style="background:#FFFBF0;padding:20px">
      <div style="text-align:center;padding:40px 0 20px">
        <div style="font-size:56px">🌟</div>
        <h3 style="font-size:18px;color:#333;margin-top:12px">开始创作专属绘本</h3>
        <p style="font-size:13px;color:#999;margin-top:8px">只需 3 步，AI 为你的孩子写出独一无二的故事</p>
      </div>
      <button class="btn-primary" style="margin-top:20px" @click="$navigate('/book/create')">✨ 开始创作</button>

      <!-- Book History Preview -->
      <div style="text-align:center;margin-top:40px">
        <p style="font-size:13px;color:#999;margin-bottom:16px">—— 最近创作的绘本 ——</p>
        <div v-if="bookHistory.length === 0" style="color:#ccc;font-size:13px;padding:20px">
          还没有创作过绘本，快去试试吧~
        </div>
        <div v-for="book in bookHistory" :key="book.id" class="history-item" @click="viewBook(book)">
          <div class="book-icon">📖</div>
          <div class="book-meta">
            <h4>{{ book.title }}</h4>
            <p>{{ book.date }}</p>
          </div>
          <span style="color:#ccc;font-size:14px">›</span>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-item" @click="$navigate('/home')"><span class="icon">🏠</span><span>首页</span></button>
      <button class="tab-item" @click="$navigate('/chat')"><span class="icon">💬</span><span>问答</span></button>
      <button class="tab-item active" @click="$navigate('/book')"><span class="icon">📖</span><span>绘本</span></button>
      <button class="tab-item" @click="$navigate('/profile')"><span class="icon">👤</span><span>我的</span></button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  setup() {
    const bookHistory = ref(
      JSON.parse(localStorage.getItem('bookHistory') || '[]').slice(0, 5)
    );

    const viewBook = (book) => {
      localStorage.setItem('currentBook', JSON.stringify(book));
      window.$navigate('/book/story');
    };

    return { bookHistory, viewBook };
  },
};
</script>

<style scoped>
.history-item {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border-radius: 16px; padding: 16px;
  margin-bottom: 10px; cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.history-item:active { opacity: .9; }
.book-icon { font-size: 28px; }
.book-meta { flex: 1; }
.book-meta h4 { font-size: 15px; color: #333; margin-bottom: 4px; }
.book-meta p { font-size: 12px; color: #999; }
</style>
