<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/home')">←</span>
      <span class="title">问答详情</span>
    </div>

    <div class="scroll-area" style="padding:20px" v-if="question">
      <div class="qa-card">
        <div class="qa-question">
          <span class="qa-icon">❓</span>
          <h2>{{ question.question }}</h2>
        </div>
        <div class="qa-answer" v-html="formatAnswer(question.answer)"></div>
        <div class="qa-meta">
          <span>{{ question.category }}</span>
          <span>{{ question.view_count }} 浏览</span>
          <span>{{ question.likes }} 点赞</span>
        </div>
      </div>

      <button class="like-btn" @click="handleLike">
        👍 有帮助 ({{ question.likes }})
      </button>
    </div>

    <div v-else style="text-align:center;padding:60px;color:#999">加载中...</div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getQA } from '../api/index';

export default {
  setup() {
    const question = ref(null);

    const formatAnswer = (text) => {
      if (!text) return '';
      return text.replace(/\n/g, '<br>');
    };

    const handleLike = () => {
      window.$toast('感谢您的反馈！');
    };

    onMounted(async () => {
      const hash = window.location.hash;
      const match = hash.match(/id=(\d+)/);
      if (match) {
        try {
          const res = await getQA();
          if (res.success) {
            question.value = res.qa.find(q => q.id === parseInt(match[1]));
          }
        } catch (e) {
          // silently fail
        }
      }
    });

    return { question, formatAnswer, handleLike };
  },
};
</script>

<style scoped>
.qa-card {
  background: #fff; border-radius: 16px; padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}
.qa-question { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
.qa-icon { font-size: 24px; flex-shrink: 0; }
.qa-question h2 { font-size: 17px; color: #333; line-height: 1.5; }
.qa-answer { font-size: 15px; color: #444; line-height: 1.8; padding: 16px; background: #F8F9FA; border-radius: 12px; }
.qa-meta { display: flex; gap: 16px; margin-top: 16px; font-size: 12px; color: #999; }
.like-btn {
  width: 100%; height: 48px; border-radius: 24px;
  border: 2px solid #FF9F43; background: #FFF8F0; color: #FF9F43;
  font-size: 15px; cursor: pointer; margin-top: 20px;
}
</style>
