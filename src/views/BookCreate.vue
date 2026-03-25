<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/book')">←</span>
      <span class="title">生成专属绘本</span>
    </div>

    <div class="scroll-area" style="background:#FFFBF0">
      <!-- Step 1 -->
      <div class="step-content" style="padding:20px">
        <div class="step-dots">
          <div class="step-dot" :class="{ active: step >= 1, done: step > 1 }"></div>
          <div class="step-dot" :class="{ active: step >= 2, done: step > 2 }"></div>
          <div class="step-dot" :class="{ active: step >= 3 }"></div>
        </div>

        <!-- Step 1: Baby Info -->
        <div v-if="step === 1">
          <div style="text-align:center;margin-bottom:24px">
            <div style="font-size:32px">📖</div>
            <h2 style="font-size:20px;color:#333;margin-top:8px">为你的孩子生成专属故事</h2>
          </div>

          <div class="form-group">
            <label>孩子的名字 <span style="color:#FF6B6B">*</span></label>
            <input class="form-input" type="text" v-model="form.name" placeholder="输入孩子的名字">
          </div>

          <div class="form-group">
            <label>孩子的年龄 <span style="color:#FF6B6B">*</span></label>
            <div class="btn-group">
              <button v-for="a in ['3岁','4岁','5岁','6岁']" :key="a"
                class="select-btn" :class="{ active: form.age === a }"
                @click="form.age = a">{{ a }}</button>
            </div>
          </div>

          <div class="form-group">
            <label>性别（选填）</label>
            <div class="btn-group">
              <button class="select-btn" :class="{ active: form.gender === '男' }" @click="form.gender = '男'">👦 男孩</button>
              <button class="select-btn" :class="{ active: form.gender === '女' }" @click="form.gender = '女'">👧 女孩</button>
            </div>
          </div>

          <div class="form-group">
            <label>兴趣爱好（选填）</label>
            <input class="form-input" type="text" v-model="form.hobbies" placeholder="如：恐龙、画画、足球">
            <div style="font-size:12px;color:#999;margin-top:6px">可以写多个，用逗号分隔</div>
          </div>

          <button class="btn-primary" @click="step = 2">下一步 →</button>
        </div>

        <!-- Step 2: Theme -->
        <div v-if="step === 2">
          <h2 style="font-size:20px;color:#333;text-align:center;margin-bottom:4px">选一个故事主题 🌟</h2>
          <p style="text-align:center;color:#999;font-size:13px;margin-bottom:12px">为{{ form.name || '宝贝' }}选择一个故事方向</p>

          <div class="theme-grid">
            <div v-for="t in themes" :key="t.value"
              class="theme-card" :class="{ active: form.theme === t.value }"
              @click="form.theme = t.value">
              <div class="theme-icon">{{ t.icon }}</div>
              <div class="theme-name">{{ t.name }}</div>
              <div class="theme-desc">{{ t.desc }}</div>
            </div>
          </div>

          <button class="btn-primary" style="margin-top:20px" @click="generate" :disabled="!form.theme || generating">
            {{ generating ? '生成中...' : '生成故事 ✨' }}
          </button>
        </div>

        <!-- Step 3: Generating -->
        <div v-if="step === 3 && generating" class="loading-state">
          <div class="loading-emoji">✨</div>
          <div class="loading-text">正在为 {{ form.name }} 创作故事...</div>
          <div style="font-size:13px;color:#999">AI 正在努力写作中，请稍候~</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { generateStory } from '../api/index';

export default {
  setup() {
    const step = ref(1);
    const generating = ref(false);

    const form = reactive({
      name: '',
      age: '',
      gender: '男',
      hobbies: '',
      theme: '',
    });

    const themes = [
      { value: '睡前故事', icon: '🌙', name: '睡前故事', desc: '温馨安宁，伴你入眠' },
      { value: '冒险探索', icon: '🏔️', name: '冒险探索', desc: '勇敢好奇，发现世界' },
      { value: '友谊成长', icon: '🤝', name: '友谊成长', desc: '分享合作，快乐相伴' },
      { value: '学习发现', icon: '📚', name: '学习发现', desc: '好奇心驱动的奇妙旅程' },
      { value: '勇气故事', icon: '💪', name: '勇气故事', desc: '克服恐惧，变得勇敢' },
    ];

    const generate = async () => {
      if (!form.name || !form.theme) {
        window.$toast('请填写孩子名字并选择主题', 'error');
        step.value = 1;
        return;
      }

      generating.value = true;
      step.value = 3;

      try {
        const res = await generateStory({
          name: form.name,
          age: form.age,
          gender: form.gender,
          hobbies: form.hobbies,
          theme: form.theme,
        });

        // Save to history
        const history = JSON.parse(localStorage.getItem('bookHistory') || '[]');
        const book = {
          id: Date.now(),
          title: res.title,
          story: res.story,
          date: new Date().toLocaleDateString(),
          form: { ...form },
        };
        history.unshift(book);
        localStorage.setItem('bookHistory', JSON.stringify(history));
        localStorage.setItem('currentBook', JSON.stringify(book));

        generating.value = false;
        window.$navigate('/book/story');
      } catch (e) {
        window.$toast('生成失败，请稍后重试', 'error');
        generating.value = false;
        step.value = 2;
      }
    };

    // Auto-fill from first baby
    const babies = JSON.parse(localStorage.getItem('user') || '{}');
    // We could auto-fill from store but keep it simple

    return { step, generating, form, themes, generate };
  },
};
</script>

<style scoped>
.step-content { max-width: 400px; margin: 0 auto; }
.step-dots { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px; }
.step-dot {
  width: 10px; height: 10px; border-radius: 5px; background: #E0E0E0;
  transition: all .3s;
}
.step-dot.active { width: 24px; background: #FF9F43; }
.step-dot.done { background: #4ECB71; }

.btn-group { display: flex; gap: 10px; }
.select-btn {
  flex: 1; height: 48px; border-radius: 12px;
  border: 2px solid #E8E8E8; background: #fff;
  font-size: 15px; cursor: pointer;
}
.select-btn.active { border-color: #FF9F43; background: #FFF8F0; }

.theme-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;
}
.theme-card {
  background: #fff; border-radius: 16px; padding: 18px 12px;
  text-align: center; border: 2px solid #f0f0f0; cursor: pointer;
}
.theme-card.active { border-color: #FF9F43; background: #FFF8F0; }
.theme-icon { font-size: 30px; margin-bottom: 6px; }
.theme-name { font-size: 14px; color: #333; font-weight: 600; }
.theme-desc { font-size: 11px; color: #999; margin-top: 3px; }

.loading-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 80px 20px;
}
.loading-emoji { font-size: 48px; animation: bounce 1s ease infinite; }
.loading-text { margin-top: 20px; font-size: 16px; color: #666; }
@keyframes bounce {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
