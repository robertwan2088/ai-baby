<template>
  <div class="register-page page">
    <div class="status-bar"><span>AI 宝贝</span><span>🔋</span></div>
    <div class="scroll-area">
      <div class="register-container">
        <div class="nav-bar" style="border:none;background:transparent;padding:0;">
          <span class="back" @click="$navigate('/login')">←</span>
          <span class="title">注册账号</span>
        </div>

        <div class="form-group">
          <label>手机号</label>
          <input class="form-input" type="tel" v-model="phone" placeholder="请输入11位手机号" maxlength="11">
        </div>

        <div class="form-group">
          <label>设置密码</label>
          <input class="form-input" type="password" v-model="password" placeholder="请设置 6-20 位密码">
        </div>

        <div class="form-group">
          <label>确认密码</label>
          <input class="form-input" type="password" v-model="confirmPassword" placeholder="请再次输入密码">
        </div>

        <div class="form-group">
          <label>昵称（选填）</label>
          <input class="form-input" type="text" v-model="nickname" placeholder="给自己取个名字吧">
        </div>

        <div class="form-group">
          <label>图形验证码</label>
          <div class="form-row">
            <input class="form-input" type="text" v-model="captchaCode" placeholder="请输入验证码" maxlength="4">
            <img v-if="captchaSvg" :src="captchaSvg" class="captcha-img" alt="验证码">
            <button class="captcha-btn" @click="loadCaptcha" style="width:40px;border:none;font-size:18px;" title="刷新">🔄</button>
          </div>
        </div>

        <button class="btn-primary" @click="handleRegister" :disabled="loading">
          {{ loading ? '注册中...' : '注 册' }}
        </button>

        <div class="login-link">
          已有账号？<span @click="$navigate('/login')">去登录</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getCaptcha, register } from '../api/index';
import store from '../stores/index';

export default {
  setup() {
    const phone = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const nickname = ref('');
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

    const handleRegister = async () => {
      if (!/^1\d{10}$/.test(phone.value)) {
        return window.$toast('请输入正确的手机号', 'error');
      }
      if (!password.value || password.value.length < 6) {
        return window.$toast('密码至少6位', 'error');
      }
      if (password.value !== confirmPassword.value) {
        return window.$toast('两次密码不一致', 'error');
      }
      if (!captchaCode.value || captchaCode.value.length !== 4) {
        return window.$toast('请输入4位验证码', 'error');
      }

      loading.value = true;
      try {
        const res = await register({
          phone: phone.value,
          password: password.value,
          nickname: nickname.value || undefined,
          captcha_id: captchaId.value,
          captcha_code: captchaCode.value,
        });

        if (res.success) {
          store.login(res);
          window.$toast('注册成功', 'success');
          setTimeout(() => window.$navigate('/home'), 500);
        } else {
          window.$toast(res.error || '注册失败', 'error');
          loadCaptcha();
        }
      } catch (e) {
        window.$toast(e.message || '注册失败', 'error');
        loadCaptcha();
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => { loadCaptcha(); });

    return { phone, password, confirmPassword, nickname, captchaCode, captchaSvg, loading, loadCaptcha, handleRegister };
  },
};
</script>

<style scoped>
.register-page {
  background: linear-gradient(180deg, #FFF5E6, #FFF 50%);
}
.register-container {
  padding: 10px 28px 40px;
  display: flex; flex-direction: column; align-items: center;
}
.captcha-img {
  height: 48px; border-radius: 12px; cursor: pointer;
  border: 2px solid #E8E8E8;
}
.login-link {
  margin-top: 24px; font-size: 14px; color: #666;
}
.login-link span {
  color: #FF9F43; cursor: pointer; font-weight: 600;
}
</style>
