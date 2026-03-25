<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/profile')">←</span>
      <span class="title">成长记录</span>
    </div>

    <div class="scroll-area" style="padding:20px">
      <div v-if="store.babies.length === 0" style="text-align:center;padding:60px 20px;color:#ccc">
        <div style="font-size:48px;margin-bottom:16px">📊</div>
        <p>请先添加宝贝信息</p>
        <button class="btn-primary" style="margin-top:20px;width:auto;padding:0 40px" @click="$navigate('/baby/add')">添加宝贝</button>
      </div>

      <div v-for="baby in store.babies" :key="baby.id" class="timeline">
        <div class="timeline-header">
          <span class="timeline-icon">{{ baby.gender === '女' ? '👧' : '👦' }}</span>
          <div>
            <h3>{{ baby.name }}</h3>
            <p>{{ babyAge(baby.birthday) }}</p>
          </div>
        </div>

        <div class="timeline-item" v-for="(item, i) in mockRecords" :key="i">
          <div class="timeline-dot">{{ item.icon }}</div>
          <div class="timeline-content">
            <h4>{{ item.title }}</h4>
            <p>{{ item.content }}</p>
            <div class="timeline-time">{{ item.date }}</div>
          </div>
        </div>

        <div class="no-more" v-if="store.babies.length > 0">— 暂无更多记录 —</div>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue';
import store from '../stores/index';

export default {
  setup() {
    const mockRecords = reactive([
      { icon: '🎉', title: '出生纪念', content: '来到了这个美好的世界！', date: '2020-06-15' },
      { icon: '🦷', title: '第一颗牙', content: '开始长牙啦', date: '2020-10-20' },
      { icon: '👣', title: '第一次走路', content: '可以独立走路了', date: '2021-04-10' },
      { icon: '🗣️', title: '第一次说话', content: '会叫妈妈了', date: '2021-06-01' },
    ]);

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

    return { store, mockRecords, babyAge };
  },
};
</script>

<style scoped>
.timeline { padding-bottom: 20px; margin-bottom: 20px; }
.timeline-header {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 20px; padding: 16px; background: #fff;
  border-radius: 16px;
}
.timeline-icon { font-size: 32px; }
.timeline-header h3 { font-size: 18px; color: #333; font-weight: 600; }
.timeline-header p { font-size: 13px; color: #999; margin-top: 2px; }

.timeline-item {
  display: flex; gap: 14px; margin-bottom: 20px;
  position: relative;
}
.timeline-item::before {
  content: ''; position: absolute; left: 19px; top: 44px; bottom: -4px;
  width: 2px; background: #f0f0f0;
}
.timeline-item:last-child::before { display: none; }

.timeline-dot {
  width: 40px; height: 40px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0; z-index: 1;
  background: #FFF5E6;
}
.timeline-content {
  flex: 1; background: #fff; border-radius: 12px;
  padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.timeline-content h4 { font-size: 14px; color: #333; margin-bottom: 4px; }
.timeline-content p { font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 6px; }
.timeline-time { font-size: 11px; color: #bbb; }

.no-more { text-align: center; color: #ccc; font-size: 13px; padding: 20px 0; }
</style>
