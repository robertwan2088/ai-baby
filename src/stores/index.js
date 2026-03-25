import { reactive } from 'vue';

const store = reactive({
  // 用户信息
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  babies: [],
  isLoggedIn: !!localStorage.getItem('token'),

  // 登录/注册
  login(data) {
    this.token = data.token;
    this.user = data.user;
    this.isLoggedIn = true;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  },

  logout() {
    this.token = '';
    this.user = null;
    this.babies = [];
    this.isLoggedIn = false;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  setBabies(babies) {
    this.babies = babies;
  },

  updateUserInfo(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  },
});

export default store;
