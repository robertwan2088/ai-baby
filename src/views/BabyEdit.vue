<template>
  <div class="page">
    <div class="nav-bar">
      <span class="back" @click="$navigate('/profile')">←</span>
      <span class="title">{{ isEdit ? '编辑宝贝' : '添加宝贝' }}</span>
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
          {{ saving ? '保存中...' : '保 存' }}
        </button>

        <button v-if="isEdit" class="delete-btn" @click="handleDelete">
          删除宝贝
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { addBaby, updateBaby, deleteBaby } from '../api/index';
import store from '../stores/index';

export default {
  setup() {
    const isEdit = ref(false);
    const editId = ref(null);
    const saving = ref(false);

    const form = reactive({
      name: '',
      gender: '男',
      birthday: '',
      favorite: '',
    });

    onMounted(() => {
      const hash = window.location.hash;
      const match = hash.match(/id=(\d+)/);
      if (match) {
        const id = parseInt(match[1]);
        const baby = store.babies.find(b => b.id === id);
        if (baby) {
          isEdit.value = true;
          editId.value = id;
          form.name = baby.name;
          form.gender = baby.gender || '男';
          form.birthday = baby.birthday || '';
          form.favorite = baby.favorite || '';
        }
      }
    });

    const handleSave = async () => {
      if (!form.name.trim()) {
        return window.$toast('请输入宝贝名字', 'error');
      }

      saving.value = true;
      try {
        if (isEdit.value) {
          await updateBaby(editId.value, form);
          // Update local store
          const idx = store.babies.findIndex(b => b.id === editId.value);
          if (idx >= 0) Object.assign(store.babies[idx], form);
          window.$toast('修改成功', 'success');
        } else {
          const res = await addBaby(form);
          if (res.success) {
            store.babies.unshift(res.baby);
            window.$toast('添加成功', 'success');
          }
        }
        setTimeout(() => window.$navigate('/profile'), 500);
      } catch (e) {
        window.$toast(e.message || '保存失败', 'error');
      } finally {
        saving.value = false;
      }
    };

    const handleDelete = async () => {
      if (!confirm('确定要删除这个宝贝吗？')) return;

      try {
        await deleteBaby(editId.value);
        store.babies = store.babies.filter(b => b.id !== editId.value);
        window.$toast('已删除', 'success');
        window.$navigate('/profile');
      } catch (e) {
        window.$toast(e.message || '删除失败', 'error');
      }
    };

    return { isEdit, form, saving, handleSave, handleDelete };
  },
};
</script>

<style scoped>
.edit-form { padding: 20px; }
.btn-group { display: flex; gap: 10px; }
.select-btn {
  flex: 1; height: 48px; border-radius: 12px;
  border: 2px solid #E8E8E8; background: #fff;
  font-size: 15px; cursor: pointer;
}
.select-btn.active { border-color: #FF9F43; background: #FFF8F0; }

.delete-btn {
  width: 100%; height: 48px; border-radius: 24px;
  border: 2px solid #FF6B6B; background: #fff; color: #FF6B6B;
  font-size: 15px; cursor: pointer; margin-top: 16px;
}
</style>
