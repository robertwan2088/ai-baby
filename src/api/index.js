// API 调用封装
const BASE = '';

function getToken() {
  return localStorage.getItem('token') || '';
}

function getAdminToken() {
  return localStorage.getItem('adminToken') || '';
}

async function request(url, options = {}) {
  const token = options.admin ? getAdminToken() : getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const res = await fetch(BASE + url, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (res.status === 401 && !options.admin) {
    // Token 过期，跳转登录
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '#/login';
    throw new Error('登录已过期');
  }

  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

// ========== 公开 API ==========

// 获取验证码
export async function getCaptcha() {
  return request('/api/captcha');
}

// 注册
export async function register({ phone, password, nickname, captcha_id, captcha_code }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, password, nickname, captcha_id, captcha_code }),
  });
}

// 登录
export async function login({ phone, password, captcha_id, captcha_code }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password, captcha_id, captcha_code }),
  });
}

// ========== 用户 API ==========

export async function getUserInfo() {
  return request('/api/user/me');
}

export async function updateUserInfo(data) {
  return request('/api/user/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ========== 宝贝 API ==========

export async function getBabies() {
  return request('/api/babies');
}

export async function addBaby(data) {
  return request('/api/babies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBaby(id, data) {
  return request(`/api/babies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBaby(id) {
  return request(`/api/babies/${id}`, {
    method: 'DELETE',
  });
}

// ========== 游戏 API ==========

export async function getGames(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/games${qs ? '?' + qs : ''}`);
}

// ========== 问答 API ==========

export async function getQA(category) {
  const qs = category ? '?category=' + category : '';
  return request('/api/qa' + qs);
}

// ========== 推荐 API ==========

export async function getRecommendations(category) {
  const qs = category ? '?category=' + category : '';
  return request('/api/recommendations' + qs);
}

// ========== AI API ==========

export async function chat({ message, baby_id }) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, baby_id }),
  });
}

export async function generateStory({ name, age, gender, hobbies, theme }) {
  return request('/api/story', {
    method: 'POST',
    body: JSON.stringify({ name, age, gender, hobbies, theme }),
  });
}

// ========== 管理员 API ==========

export async function adminLogin({ username, password }) {
  return request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    admin: true,
  });
}

export function adminRequest(url, options = {}) {
  return request(url, { ...options, admin: true });
}

export default request;
