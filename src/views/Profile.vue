<template>
  <div class="page">
    <div class="status-bar"><span>16:30</span><span>📶 🔋 87%</span></div>

    <div class="scroll-area" style="background:#F8F9FA">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-info">
          <div class="profile-avatar">{{ store.user?.nickname?.charAt(0) || '😊' }}</div>
          <div class="profile-name">
            <h3>{{ store.user?.nickname || '未登录' }}</h3>
            <p>{{ store.user?.phone || '' }}</p>
          </div>
        </div>
        <div class="profile-stats">
          <div class="stat"><div class="stat-num">{{ bookCount }}</div><div class="stat-label">生成绘本</div></div>
          <div class="stat"><div class="stat-num">{{ store.babies.length }}</div><div class="stat-label">我的宝贝</div></div>
        </div>
      </div>

      <!-- Babies Section -->
      <div class="section">
        <div class="section-title">宝贝信息</div>
        <div class="menu-list">
          <div class="menu-item" v-for="baby in store.babies" :key="baby.id" @click="$navigate('/baby/edit?id=' + baby.id)">
            <span class="menu-icon">{{ baby.gender === '女' ? '👧' : '👦' }}</span>
            <span class="menu-text">{{ baby.name }} · {{ babyAge(baby.birthday) }}</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="$navigate('/baby/add')" style="color:#FF9F43">
            <span class="menu-icon">➕</span>
            <span class="menu-text" style="color:#FF9F43">添加宝贝</span>
            <span class="menu-arrow" style="color:#FF9F43">›</span>
          </div>
        </div>
      </div>

      <!-- Services -->
      <div class="section">
        <div class="section-title">我的服务</div>
        <div class="menu-list">
          <div class="menu-item" @click="$navigate('/book/history')">
            <span class="menu-icon">📖</span>
            <span class="menu-text">我的绘本</span>
            <span class="badge">{{ bookCount }}</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="$navigate('/chat/room')">
            <span class="menu-icon">💬</span>
            <span class="menu-text">育儿问答</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="$navigate('/growth')">
            <span class="menu-icon">📊</span>
            <span class="menu-text">成长档案</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="section">
        <div class="section-title">设置</div>
        <div class="menu-list">
          <div class="menu-item" @click="showToast('功能开发中')">
            <span class="menu-icon">🔔</span>
            <span class="menu-text">消息通知</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="showToast('功能开发中')">
            <span class="menu-icon">⚙️</span>
            <span class="menu-text">通用设置</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="showToast('功能开发中')">
            <span class="menu-icon">❓</span>
            <span class="menu-text">帮助与反馈</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
      </div>

      <!-- Logout -->
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>

    <div class="tab-bar">
      <button class="tab-item" @click="$navigate('/home')"><span class="icon">🏠</span><span>首页</span></button>
      <button class="tab-item" @click="$navigate('/chat')"><span class="icon">💬</span><span>问答</span></button>
      <button class="tab-item" @click="$navigate('/book')"><span class="icon">📖</span><span>绘本</span></button>
      <button class="tab-item active" @click="$navigate('/profile')"><span class="icon">👤</span><span>我的</span></button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import store from '../stores/index';

export default {
  setup() {
    const bookCount = ref(
      JSON.parse(localStorage.getItem('bookHistory') || '[]').length
    );

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

    const showToast = (msg) => window.$toast(msg);

    const handleLogout = () => {
      store.logout();
      window.$toast('已退出登录');
      window.$navigate('/login');
    };

    return { store, bookCount, babyAge, showToast, handleLogout };
  },
};
</script>

<style scoped>
.profile-header {
  background: linear-gradient(135deg, #FF9F43, #FF6B6B);
  padding: 30px 20px 40px; color: #fff;
}
.profile-info { display: flex; align-items: center; gap: 16px; }
.profile-avatar {
  width: 64px; height: 64px; border-radius: 32px;
  background: rgba(255,255,255,.3); display: flex; align-items: center;
  justify-content: center; font-size: 28px; font-weight: 700;
}
.profile-name h3 { font-size: 20px; }
.profile-name p { font-size: 13px; opacity: .8; margin-top: 4px; }
.profile-stats {
  display: flex; justify-content: space-around; margin-top: 24px;
  background: rgba(255,255,255,.15); border-radius: 16px; padding: 16px 0;
}
.stat { text-align: center; }
.stat-num { font-size: 22px; font-weight: 700; }
.stat-label { font-size: 11px; opacity: .8; margin-top: 2px; }

.section { margin-top: 16px; }
.section-title {
  font-size: 13px; color: #999; padding: 12px 20px;
}
.menu-list { background: #fff; }
.menu-item {
  display: flex; align-items: center; padding: 16px 20px;
  border-bottom: 1px solid #f5f5f5; cursor: pointer;
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: #f9f9f9; }
.menu-icon { font-size: 20px; margin-right: 14px; }
.menu-text { flex: 1; font-size: 15px; color: #333; }
.menu-arrow { color: #ccc; font-size: 14px; }
.badge {
  background: #FF6B6B; color: #fff; font-size: 11px;
  padding: 2px 8px; border-radius: 10px; margin-right: 8px;
}

.logout-btn {
  margin: 24px 20px; height: 48px; border-radius: 24px;
  border: 2px solid #FF6B6B; background: #fff; color: #FF6B6B;
  font-size: 15px; cursor: pointer; width: calc(100% - 40px);
}
</style>
