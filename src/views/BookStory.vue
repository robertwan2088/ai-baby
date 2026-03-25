<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/book')">←</span>
      <span class="title">{{ book?.title || '绘本故事' }}</span>
    </div>

    <div class="scroll-area" style="background:#FFFBF0">
      <div class="story-content" v-if="book">
        <div class="story-header">
          <div class="story-img">🦕🌟🎨</div>
          <h2>{{ book.title }}</h2>
        </div>
        <div class="story-text" v-html="formatStory(book.story)"></div>
      </div>

      <div v-else style="padding:80px 20px;text-align:center;color:#999">
        没有找到绘本内容
      </div>
    </div>

    <div class="story-actions">
      <button @click="regenerate">🔄 重新生成</button>
      <button class="primary" @click="share">📤 分享</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const book = ref(null);

    const formatStory = (text) => {
      if (!text) return '';
      return text.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
    };

    const regenerate = () => window.$navigate('/book/create');

    const share = () => {
      if (navigator.share) {
        navigator.share({
          title: book.value?.title,
          text: book.value?.story?.substring(0, 100) + '...',
        });
      } else {
        window.$toast('分享功能暂不可用');
      }
    };

    onMounted(() => {
      const saved = localStorage.getItem('currentBook');
      if (saved) {
        book.value = JSON.parse(saved);
      }
    });

    return { book, formatStory, regenerate, share };
  },
};
</script>

<style scoped>
.story-content { padding: 20px; }
.story-header { text-align: center; margin-bottom: 20px; }
.story-img {
  width: 100%; height: 180px;
  background: linear-gradient(135deg, #FFECD2, #FCB69F);
  border-radius: 16px; display: flex; align-items: center;
  justify-content: center; font-size: 56px; margin-bottom: 20px;
}
.story-header h2 { font-size: 20px; color: #333; font-weight: 700; }
.story-text {
  font-size: 15px; color: #444; line-height: 2;
}
.story-text :deep(p) { margin-bottom: 14px; text-indent: 2em; }
.story-text :deep(p:last-child) { text-indent: 0; text-align: center; font-size: 14px; color: #999; }

.story-actions {
  display: flex; gap: 10px; padding: 12px 20px;
  background: #fff; border-top: 1px solid #f0f0f0;
}
.story-actions button {
  flex: 1; height: 44px; border-radius: 22px;
  border: 2px solid #E8E8E8; background: #fff;
  font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  color: #333;
}
.story-actions button.primary {
  background: #FF9F43; border-color: #FF9F43; color: #fff;
}
</style>
