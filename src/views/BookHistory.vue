<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/book')">←</span>
      <span class="title">我的绘本</span>
    </div>

    <div class="scroll-area" style="background:#FFFBF0;padding:16px 20px">
      <div v-if="books.length === 0" style="text-align:center;padding:60px 20px;color:#ccc">
        <div style="font-size:48px;margin-bottom:16px">📖</div>
        <p>还没有创作过绘本</p>
        <button class="btn-primary" style="margin-top:20px;width:auto;padding:0 40px" @click="$navigate('/book/create')">去创作</button>
      </div>

      <div v-for="book in books" :key="book.id" class="history-item" @click="viewBook(book)">
        <div class="cover">📖</div>
        <div class="meta">
          <h4>{{ book.title }}</h4>
          <p>{{ book.date }}</p>
        </div>
        <span style="color:#ccc">›</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const books = ref([]);

    const viewBook = (book) => {
      localStorage.setItem('currentBook', JSON.stringify(book));
      window.$navigate('/book/story');
    };

    onMounted(() => {
      books.value = JSON.parse(localStorage.getItem('bookHistory') || '[]');
    });

    return { books, viewBook };
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
.cover {
  width: 56px; height: 70px; border-radius: 10px;
  background: linear-gradient(135deg, #FFECD2, #FCB69F);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; flex-shrink: 0;
}
.meta { flex: 1; }
.meta h4 { font-size: 15px; color: #333; margin-bottom: 6px; }
.meta p { font-size: 12px; color: #999; }
</style>
