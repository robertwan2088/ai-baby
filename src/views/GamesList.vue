<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/home')">←</span>
      <span class="title">互动游戏</span>
    </div>

    <div class="scroll-area" style="padding:16px 20px">
      <div v-if="loading" style="text-align:center;padding:60px;color:#999">
        加载中...
      </div>

      <div v-else-if="games.length === 0" style="text-align:center;padding:60px;color:#ccc">
        <div style="font-size:48px;margin-bottom:16px">🎮</div>
        <p>暂无游戏</p>
      </div>

      <div v-for="game in games" :key="game.id" class="game-card">
        <div class="game-banner">{{ game.icon }}</div>
        <div class="game-info">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <h4>{{ game.title }}</h4>
            <span class="rating">⭐ {{ game.rating }}</span>
          </div>
          <p>{{ game.description }}</p>
          <div class="game-tags">
            <span class="game-tag">{{ game.category }}</span>
            <span class="game-tag">{{ game.age_range }}</span>
            <span class="game-tag" v-if="game.is_featured">🔥 推荐</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getGames } from '../api/index';

export default {
  setup() {
    const games = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      try {
        const res = await getGames();
        if (res.success) games.value = res.games;
      } catch (e) {
        // silently fail
      } finally {
        loading.value = false;
      }
    });

    return { games, loading };
  },
};
</script>

<style scoped>
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
.game-info p { font-size: 12px; color: #999; line-height: 1.5; }
.rating { font-size: 12px; color: #FF9F43; white-space: nowrap; }
.game-tags { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.game-tag {
  font-size: 10px; color: #FF9F43; background: #FFF5E6;
  padding: 3px 8px; border-radius: 10px;
}
</style>
