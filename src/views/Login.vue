<template>
  <div class="login-page page">
    <div class="status-bar"><span>AI 宝贝</span><span>🔋</span></div>
    <div class="login-content scroll-area">
      <div class="login-container">
        <div class="logo">
          <div class="logo-emoji">🤱</div>
          <h1>AI 宝贝</h1>
          <p>让 AI 陪你一起育儿</p>
        </div>

        <div class="form-group">
          <label>手机号</label>
          <input class="form-input" type="tel" v-model="phone" placeholder="请输入手机号" maxlength="11">
        </div>

        <div class="form-group">
          <label>密码</label>
          <input class="form-input" type="password" v-model="password" placeholder="请输入密码">
        </div>

        <div class="form-group">
          <label>图形验证码</label>
          <div class="form-row">
            <input class="form-input" type="text" v-model="captchaCode" placeholder="请输入验证码" maxlength="4" @keyup.enter="handleLogin">
            <img v-if="captchaSvg" :src="captchaSvg" class="captcha-img" @click="loadCaptcha" alt="验证码">
            <button v-if="captchaSvg" class="captcha-btn" @click="loadCaptcha" style="width:40px;border:none;font-size:18px;" title="刷新">🔄</button>
          </div>
        </div>

        <button class="btn-primary" @click="handleLogin" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>

        <div class="register-link">
          还没有账号？<span @click="$navigate('/register')">立即注册</span>
        </div>

        <div class="agreement">
          登录即代表同意 <a href="javascript:void(0)">《用户协议》</a> 和 <a href="javascript:void(0)">《隐私政策》</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getCaptcha, login } from '../api/index';
import store from '../stores/index';

export default {
  setup() {
    const phone = ref('');
    const password = ref('');
    const captchaCode = ref('');
    const captchaSvg = ref('');
    const captchaId = ref('');
    const loading = ref(false);

    const loadCaptcha = async () => {
      try {
        const res = await getCaptcha();
        captchaId.value = res.id;
        captchaSvg.value = res.svg;
      } catch (e) {
        window.$toast('获取验证码失败', 'error');
      }
    };

    const handleLogin = async () => {
      if (!/^1\d{10}$/.test(phone.value)) {
        return window.$toast('请输入正确的手机号', 'error');
      }
      if (!password.value) {
        return window.$toast('请输入密码', 'error');
      }
      if (!captchaCode.value || captchaCode.value.length !== 4) {
        return window.$toast('请输入4位验证码', 'error');
      }

      loading.value = true;
      try {
        const res = await login({
          phone: phone.value,
          password: password.value,
          captcha_id: captchaId.value,
          captcha_code: captchaCode.value,
        });

        if (res.success) {
          store.login(res);
          window.$toast('登录成功', 'success');
          setTimeout(() => window.$navigate('/home'), 500);
        } else {
          window.$toast(res.error || '登录失败', 'error');
          loadCaptcha();
        }
      } catch (e) {
        window.$toast(e.message || '登录失败', 'error');
        loadCaptcha();
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadCaptcha();
    });

    return { phone, password, captchaCode, captchaSvg, loading, loadCaptcha, handleLogin };
  },
};
</script>

<style scoped>
.login-page {
  background: linear-gradient(180deg, #FFF5E6, #FFF 50%);
}
.login-content { flex: 1; }
.login-container {
  padding: 40px 28px;
  display: flex; flex-direction: column; align-items: center;
}
.logo { text-align: center; margin-bottom: 40px; }
.logo-emoji { font-size: 72px; }
.logo h1 { font-size: 26px; color: #2D2D2D; margin-top: 12px; }
.logo p { font-size: 14px; color: #999; margin-top: 6px; }

.captcha-img {
  height: 48px; border-radius: 12px; cursor: pointer;
  border: 2px solid #E8E8E8;
}

.register-link {
  margin-top: 24px; font-size: 14px; color: #666;
}
.register-link span {
  color: #FF9F43; cursor: pointer; font-weight: 600;
}

.agreement {
  margin-top: 20px; font-size: 11px; color: #bbb;
  text-align: center; line-height: 1.6;
}
.agreement a { color: #FF9F43; text-decoration: none; }
</style>
