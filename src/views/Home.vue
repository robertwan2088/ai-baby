<template>
  <div class="page">
    <div class="status-bar"><span>16:30</span><span>📶 🔋 87%</span></div>

    <div class="scroll-area" style="background:linear-gradient(180deg,#FFF5E6,#FFF 40%)">
      <div style="padding:20px">
        <!-- Banner -->
        <div class="banner">
          <span class="banner-emoji">🤱</span>
          <h2>AI 宝贝</h2>
          <p>智能育儿问答 · 个性化绘本生成<br>让每个孩子都有专属的成长伙伴</p>
        </div>

        <!-- Quick Actions -->
        <div class="section-title">✨ 快捷功能</div>
        <div class="action-grid">
          <div class="action-card" @click="$navigate('/chat/room')">
            <div class="action-icon">💬</div>
            <h4>育儿问答</h4>
            <p>AI 顾问随时解答</p>
          </div>
          <div class="action-card" @click="$navigate('/book/create')">
            <div class="action-icon">📖</div>
            <h4>AI 绘本</h4>
            <p>生成专属故事</p>
          </div>
          <div class="action-card" @click="$navigate('/growth')">
            <div class="action-icon">📊</div>
            <h4>成长记录</h4>
            <p>记录孩子成长</p>
          </div>
          <div class="action-card" @click="$navigate('/games')">
            <div class="action-icon">🎮</div>
            <h4>互动游戏</h4>
            <p>边玩边学</p>
          </div>
        </div>

        <!-- Baby Cards -->
        <template v-if="store.babies.length > 0">
          <div class="section-title">👶 我的宝贝</div>
          <div class="baby-cards">
            <div class="baby-card" v-for="baby in store.babies" :key="baby.id" @click="editBaby(baby)">
              <div class="baby-avatar">{{ baby.gender === '女' ? '👧' : '👦' }}</div>
              <div class="baby-info">
                <div class="baby-name">{{ baby.name }}</div>
                <div class="baby-age">{{ babyAge(baby.birthday) }} · {{ baby.gender }}</div>
              </div>
              <span class="arrow">›</span>
            </div>
          </div>
        </template>

        <!-- Recommendations -->
        <div class="section-title">💡 今日推荐</div>
        <div class="tip-card" v-for="rec in recommendations" :key="rec.id">
          <div class="tip-header">
            <span>📝</span>
            <h4>{{ rec.title }}</h4>
          </div>
          <div class="tip-content" v-html="formatContent(rec.content)"></div>
        </div>

        <!-- Games Preview -->
        <div class="section-title">🎮 推荐游戏</div>
        <div class="game-list">
          <div class="game-card" v-for="game in featuredGames" :key="game.id" @click="$navigate('/games')">
            <div class="game-banner">{{ game.icon }}</div>
            <div class="game-info">
              <h4>{{ game.title }}</h4>
              <p>{{ game.description }}</p>
              <div class="game-tags">
                <span class="game-tag">{{ game.category }}</span>
                <span class="game-tag">{{ game.age_range }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="tab-bar">
      <button class="tab-item active" @click="$navigate('/home')">
        <span class="icon">🏠</span><span>首页</span>
      </button>
      <button class="tab-item" @click="$navigate('/chat')">
        <span class="icon">💬</span><span>问答</span>
      </button>
      <button class="tab-item" @click="$navigate('/book')">
        <span class="icon">📖</span><span>绘本</span>
      </button>
      <button class="tab-item" @click="$navigate('/profile')">
        <span class="icon">👤</span><span>我的</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import store from '../stores/index';
import { getRecommendations, getGames } from '../api/index';

export default {
  setup() {
    const recommendations = ref([]);
    const featuredGames = ref([]);

    const babyAge = (birthday) => {
      if (!birthday) return '年龄未知';
      const birth = new Date(birthday);
      const now = new Date();
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
      if (months < 12) return months + '个月';
      const y = Math.floor(months / 12);
      const m = months % 12;
      return m > 0 ? y + '岁' + m + '个月' : y + '岁';
    };

    const formatContent = (text) => {
      if (!text) return '';
      return text.replace(/\n/g, '<br>');
    };

    const editBaby = (baby) => {
      window.$navigate('/baby/edit?id=' + baby.id);
    };

    onMounted(async () => {
      try {
        const [recRes, gameRes] = await Promise.all([
          getRecommendations(),
          getGames({ is_featured: 'true' }),
        ]);
        if (recRes.success) recommendations.value = recRes.recommendations.slice(0, 3);
        if (gameRes.success) featuredGames.value = gameRes.games.slice(0, 3);
      } catch (e) {
        // silently fail
      }
    });

    return { store, recommendations, featuredGames, babyAge, formatContent, editBaby };
  },
};
</script>

<style scoped>
.banner {
  background: linear-gradient(135deg, #FF9F43, #FF6B6B);
  border-radius: 20px; padding: 24px; color: #fff;
  position: relative; overflow: hidden;
}
.banner h2 { font-size: 22px; margin-bottom: 8px; }
.banner p { font-size: 13px; opacity: .9; line-height: 1.5; }
.banner-emoji {
  font-size: 48px; position: absolute; right: 16px; top: 12px;
}

.action-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  padding: 0 20px; margin-bottom: 30px;
}
.action-card {
  background: #fff; border-radius: 16px; padding: 20px 16px;
  cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,.05);
  text-align: center; transition: transform .2s;
}
.action-card:active { transform: scale(0.97); }
.action-icon { font-size: 36px; margin-bottom: 8px; }
.action-card h4 { font-size: 15px; color: #333; margin-bottom: 4px; }
.action-card p { font-size: 11px; color: #999; }

.baby-cards { margin: 0 20px 30px; }
.baby-card {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border-radius: 16px; padding: 16px;
  margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.04);
  cursor: pointer;
}
.baby-card:active { opacity: .9; }
.baby-avatar { font-size: 28px; }
.baby-info { flex: 1; }
.baby-name { font-size: 16px; font-weight: 600; color: #333; }
.baby-age { font-size: 13px; color: #999; margin-top: 2px; }
.arrow { color: #ccc; font-size: 18px; }

.tip-card {
  background: #F8F9FA; border-radius: 16px; padding: 20px;
  margin: 0 20px 14px;
}
.tip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.tip-header h4 { font-size: 15px; color: #333; }
.tip-content { font-size: 13px; color: #666; line-height: 1.8; }

.game-list { padding: 0 20px; margin-bottom: 30px; }
.game-card {
  background: #fff; border-radius: 16px; overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.04); margin-bottom: 14px;
  display: flex; cursor: pointer;
}
.game-card:active { opacity: .9; }
.game-banner {
  width: 100px; height: 100px; display: flex; align-items: center;
  justify-content: center; font-size: 40px; background: #FFF5E6;
  flex-shrink: 0;
}
.game-info { padding: 14px 16px; flex: 1; }
.game-info h4 { font-size: 15px; color: #333; margin-bottom: 4px; }
.game-info p { font-size: 12px; color: #999; }
.game-tags { display: flex; gap: 6px; margin-top: 8px; }
.game-tag {
  font-size: 10px; color: #FF9F43; background: #FFF5E6;
  padding: 3px 8px; border-radius: 10px;
}
</style>
