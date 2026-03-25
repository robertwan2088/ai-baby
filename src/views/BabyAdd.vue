<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/profile')">←</span>
      <span class="title">添加宝贝</span>
    </div>

    <div class="scroll-area" style="background:#fff">
      <div class="edit-form">
        <div class="form-group">
          <label>宝贝名字 <span style="color:#FF6B6B">*</span></label>
          <input class="form-input" type="text" v-model="form.name" placeholder="请输入宝贝名字">
        </div>

        <div class="form-group">
          <label>性别</label>
          <div class="btn-group">
            <button class="select-btn" :class="{ active: form.gender === '男' }" @click="form.gender = '男'">👦 男孩</button>
            <button class="select-btn" :class="{ active: form.gender === '女' }" @click="form.gender = '女'">👧 女孩</button>
          </div>
        </div>

        <div class="form-group">
          <label>出生日期</label>
          <input class="form-input" type="date" v-model="form.birthday">
        </div>

        <div class="form-group">
          <label>兴趣爱好（选填）</label>
          <input class="form-input" type="text" v-model="form.favorite" placeholder="如：恐龙、画画、积木">
        </div>

        <button class="btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '添加宝贝' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { addBaby } from '../api/index';
import store from '../stores/index';

export default {
  setup() {
    const saving = ref(false);
    const form = reactive({ name: '', gender: '男', birthday: '', favorite: '' });

    const handleSave = async () => {
      if (!form.name.trim()) return window.$toast('请输入宝贝名字', 'error');
      saving.value = true;
      try {
        const res = await addBaby(form);
        if (res.success) {
          store.babies.unshift(res.baby);
          window.$toast('添加成功', 'success');
          setTimeout(() => window.$navigate('/profile'), 500);
        }
      } catch (e) {
        window.$toast(e.message || '添加失败', 'error');
      } finally {
        saving.value = false;
      }
    };

    return { form, saving, handleSave };
  },
};
</script>

<style scoped>
.edit-form { padding: 20px; }
.btn-group { display: flex; gap: 10px; }
.select-btn { flex: 1; height: 48px; border-radius: 12px; border: 2px solid #E8E8E8; background: #fff; font-size: 15px; cursor: pointer; }
.select-btn.active { border-color: #FF9F43; background: #FFF8F0; }
</style>
