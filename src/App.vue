<template>
  <div class="app" id="app">
    <!-- Toast 提示 -->
    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.msg }}</div>

    <!-- 路由 -->
    <component :is="currentPage" />
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import store from './stores/index';
import { getUserInfo, getBabies } from './api/index';

import Login from './views/Login.vue';
import Register from './views/Register.vue';
import Home from './views/Home.vue';
import ChatTab from './views/ChatTab.vue';
import BookTab from './views/BookTab.vue';
import Profile from './views/Profile.vue';
import ChatRoom from './views/ChatRoom.vue';
import BookCreate from './views/BookCreate.vue';
import BookStory from './views/BookStory.vue';
import BookHistory from './views/BookHistory.vue';
import BabyEdit from './views/BabyEdit.vue';
import BabyAdd from './views/BabyAdd.vue';
import GrowthRecord from './views/GrowthRecord.vue';
import GamesList from './views/GamesList.vue';
import QADetail from './views/QADetail.vue';

const routes = {
  '/login': Login,
  '/register': Register,
  '/home': Home,
  '/chat': ChatTab,
  '/book': BookTab,
  '/profile': Profile,
  '/chat/room': ChatRoom,
  '/book/create': BookCreate,
  '/book/story': BookStory,
  '/book/history': BookHistory,
  '/baby/edit': BabyEdit,
  '/baby/add': BabyAdd,
  '/growth': GrowthRecord,
  '/games': GamesList,
  '/qa/detail': QADetail,
};

export default {
  name: 'App',
  components: {
    Login, Register, Home, ChatTab, BookTab, Profile,
    ChatRoom, BookCreate, BookStory, BookHistory,
    BabyEdit, BabyAdd, GrowthRecord, GamesList, QADetail,
  },
  setup() {
    const currentPath = ref(window.location.hash.slice(1) || '/home');

    const toast = reactive({ show: false, msg: '', type: 'info' });
    let toastTimer = null;

    const showToast = (msg, type = 'info') => {
      toast.show = true;
      toast.msg = msg;
      toast.type = type;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.show = false; }, 2000);
    };

    // Make toast globally available
    window.$toast = showToast;

    // Check auth on load
    onMounted(async () => {
      if (store.isLoggedIn && store.token) {
        try {
          const res = await getUserInfo();
          if (res.success) {
            store.updateUserInfo(res.user);
            store.setBabies(res.babies || []);
          }
        } catch (e) {
          store.logout();
          currentPath.value = '/login';
        }
      } else {
        currentPath.value = '/login';
      }
    });

    const currentPage = computed(() => {
      const page = routes[currentPath.value];
      return page || Home;
    });

    watch(currentPath, (val) => {
      window.location.hash = val;
    });

    window.addEventListener('hashchange', () => {
      currentPath.value = window.location.hash.slice(1) || '/home';
    });

    // Global navigation
    window.$navigate = (path) => {
      currentPath.value = path;
    };

    return { currentPath, toast, showToast };
  },
};
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  background: #f5f5f5;
  -webkit-font-smoothing: antialiased;
}

/* Toast */
.toast {
  position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 20px; font-size: 14px;
  z-index: 9999; animation: toastIn 0.3s ease;
  max-width: 80%; text-align: center;
}
.toast.info { background: rgba(0,0,0,0.75); color: #fff; }
.toast.success { background: #4ECB71; color: #fff; }
.toast.error { background: #FF6B6B; color: #fff; }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Status Bar */
.status-bar {
  height: 44px; background: #fff;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; font-size: 12px; font-weight: 600;
  flex-shrink: 0;
}

/* Nav Bar */
.nav-bar {
  height: 52px; background: #fff;
  display: flex; align-items: center; padding: 0 16px;
  border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}
.nav-bar .back { font-size: 20px; cursor: pointer; padding: 8px; margin-left: -8px; }
.nav-bar .title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #2D2D2D; margin-right: 28px; }

/* Tab Bar */
.tab-bar {
  height: 64px; background: #fff; border-top: 1px solid #f0f0f0;
  display: flex; align-items: center; justify-content: space-around;
  padding-bottom: 8px; flex-shrink: 0;
}
.tab-item {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  cursor: pointer; padding: 6px 12px; color: #999; font-size: 10px;
  background: none; border: none;
}
.tab-item.active { color: #FF9F43; }
.tab-item .icon { font-size: 22px; }

/* Button */
.btn-primary {
  width: 100%; height: 52px; border-radius: 26px; border: none;
  background: linear-gradient(135deg, #FF9F43, #FF6B6B);
  color: #fff; font-size: 17px; font-weight: 600; cursor: pointer;
}
.btn-primary:active { transform: scale(0.98); opacity: 0.9; }

/* Form */
.form-group { margin-bottom: 20px; }
.form-group label {
  display: block; font-size: 13px; color: #666; margin-bottom: 8px; font-weight: 500;
}
.form-input {
  width: 100%; height: 48px; border-radius: 12px;
  border: 2px solid #E8E8E8; padding: 0 16px; font-size: 15px;
  outline: none; background: #fff;
}
.form-input:focus { border-color: #FF9F43; }
.form-input::placeholder { color: #ccc; }

.form-row { display: flex; gap: 12px; align-items: flex-end; }
.form-row .form-input { flex: 1; }
.captcha-btn {
  width: 110px; height: 48px; border-radius: 12px;
  border: 2px solid #FF9F43; background: #fff; color: #FF9F43;
  font-size: 13px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
}
.captcha-btn:disabled { border-color: #ccc; color: #ccc; }

/* Section Title */
.section-title {
  font-size: 17px; font-weight: 700; color: #333;
  margin: 0 20px 14px;
}

/* Scrollable */
.scroll-area { flex: 1; overflow-y: auto; }
.scroll-area::-webkit-scrollbar { display: none; }

/* Page transition */
.page { display: flex; flex-direction: column; min-height: 100vh; }
</style>
