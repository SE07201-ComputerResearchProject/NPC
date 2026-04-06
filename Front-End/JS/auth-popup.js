// auth-popup.js - handles authentication UI

const USER_API_BASE_URL = 'http://127.0.0.1:3001/api/users';
const PUBLIC_CONFIG_API_URL = 'http://127.0.0.1:3001/api/config/public';
const USER_API_FALLBACKS = [USER_API_BASE_URL];
const PUBLIC_CONFIG_API_FALLBACKS = [PUBLIC_CONFIG_API_URL];
let recaptchaSiteKey = '';
let googleClientId = '';
let recaptchaScriptPromise = null;
let googleScriptPromise = null;
let googleInitialized = false;
let activeAuthMode = 'login';
let loginRecaptchaId = null;
let signupRecaptchaId = null;
let loginRequiresCaptcha = false;
let loginRequiresOtp = false;
let googleIdToken = ''; // For OTP challenge flow
let googleOtpMode = false; // Flag to know if handling Google TOTP
let googleEmailOtpMode = false; // Flag to know if handling Google email OTP
let googleCaptchaMode = false; // Flag to know if captcha required for Google login retry
let pendingEmail = ''; // Saved email during OTP challenge flow (local login)
let pendingPassword = ''; // Saved password during OTP challenge flow (local login)

async function fetchWithFallback(urls, options = {}) {
  let lastError = null;

  for (const url of urls) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Network request failed');
}

function buildUserApiUrls(pathSuffix) {
  return USER_API_FALLBACKS.map(base => `${String(base).replace(/\/$/, '')}/${pathSuffix}`);
}

function applyAuthSuccess(data, fallbackMessage) {
  const user = data?.user || {};
  const userId = user.id || user._id || '';
  const normalizedUsername = user.username || user.fullName || (user.email ? user.email.split('@')[0] : 'User');

  const profile = {
    userId,
    username: normalizedUsername,
    email: user.email || '',
    role: user.role || 'user',
    provider: user.provider || 'local',
    googleId: user.googleId || '',
    fullName: user.fullName || '',
    dateOfBirth: user.dateOfBirth || null,
    address: user.address || { street: '', city: '', state: '', zip: '' },
    avatarUrl: user.avatarUrl || '',
  };

  saveProfile(profile);
  if (userId) {
    localStorage.setItem('userId', userId);
  }
  window.isLoggedIn = true;
  setAuthState(true);
  if (data.token) setAuthToken(data.token);
  if (window.hydrateCommerceState) {
    window.commerceStateReady = window.hydrateCommerceState();
  }
  closeAuthPopup();
  showPopup(data.message || fallbackMessage);
  if (window.updateAccountDropdown) window.updateAccountDropdown();
  if (window.updateWelcomeMessage) window.updateWelcomeMessage();
}

async function fetchPublicAuthConfig() {
  if (recaptchaSiteKey || googleClientId) {
    return { recaptchaSiteKey, googleClientId };
  }

  try {
    const response = await fetchWithFallback(PUBLIC_CONFIG_API_FALLBACKS);
    if (!response.ok) return { recaptchaSiteKey: '', googleClientId: '' };

    const payload = await response.json();
    recaptchaSiteKey = payload.recaptchaSiteKey || '';
    googleClientId = payload.googleClientId || '';
    return { recaptchaSiteKey, googleClientId };
  } catch {
    return { recaptchaSiteKey: '', googleClientId: '' };
  }
}

async function fetchRecaptchaSiteKey() {
  const config = await fetchPublicAuthConfig();
  return config.recaptchaSiteKey || '';
}

async function fetchGoogleClientId() {
  const config = await fetchPublicAuthConfig();
  return config.googleClientId || '';
}

function ensureRecaptchaScript() {
  if (window.grecaptcha && window.grecaptcha.render) {
    return Promise.resolve();
  }

  if (recaptchaScriptPromise) return recaptchaScriptPromise;

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
}

function ensureGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

async function renderGoogleButton(containerId, mode) {
  const clientId = await fetchGoogleClientId();
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!clientId) {
    container.innerHTML = '';
    return;
  }

  await ensureGoogleScript();
  if (!window.google?.accounts?.id) return;

  activeAuthMode = mode;

  if (!googleInitialized) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
    });
    googleInitialized = true;
  }

  container.innerHTML = '';
  window.google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'large',
    width: 280,
    text: 'signin_with',
    shape: 'pill',
  });
}

async function handleGoogleCredentialResponse(response) {
  try {
    const idToken = response?.credential;
    if (!idToken) {
      showPopup('Missing Google credential. Please try again.');
      return;
    }

    const captchaToken = getRecaptchaResponseByMode(activeAuthMode);

    const res = await fetchWithFallback(buildUserApiUrls('google'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, captchaToken }),
    });

    const data = await res.json();

    if (res.status === 202 && data.requiresOtp) {
      // TOTP challenge required
      googleIdToken = idToken;
      googleOtpMode = true;
      googleEmailOtpMode = false;
      applyLoginChallengeState({
        requiresOtp: true,
        requiresCaptcha: data.requiresCaptcha || false,
        message: data.message,
      });
      showPopup(data.message);
      return;
    }

    if (res.status === 202 && data.requiresEmailOtp) {
      // Email OTP challenge required
      googleIdToken = idToken;
      googleEmailOtpMode = true;
      googleOtpMode = false;
      applyLoginChallengeState({
        requiresOtp: true,
        requiresCaptcha: false,
        message: data.message,
        emailOtpMode: true,
      });
      showPopup(data.message);
      return;
    }

    if (res.status === 202 && data.requiresMfaChoice) {
      // Both TOTP and Email OTP are enabled — let user pick
      googleIdToken = idToken;
      googleOtpMode = false;
      googleEmailOtpMode = false;
      showMfaChoiceStep();
      return;
    }

    if (!res.ok) {
      resetRecaptchaByMode(activeAuthMode);
      if (data.requiresOtp) {
        googleIdToken = idToken;
        googleOtpMode = true;
        googleEmailOtpMode = false;
        googleCaptchaMode = false;
        applyLoginChallengeState({
          requiresOtp: true,
          requiresCaptcha: data.requiresCaptcha || false,
          message: data.message,
        });
      } else if (data.requiresEmailOtp) {
        googleIdToken = idToken;
        googleEmailOtpMode = true;
        googleOtpMode = false;
        googleCaptchaMode = false;
        applyLoginChallengeState({
          requiresOtp: true,
          requiresCaptcha: data.requiresCaptcha || false,
          message: data.message,
          emailOtpMode: true,
        });
      } else if (data.requiresCaptcha) {
        // Spam protection: captcha required before Google login can proceed
        googleIdToken = idToken;
        googleCaptchaMode = true;
        googleOtpMode = false;
        googleEmailOtpMode = false;
        applyLoginChallengeState({
          requiresCaptcha: true,
          message: data.message,
        });
      }
      showPopup(data.message || 'Google sign-in failed');
      return;
    }

    // Success
    googleIdToken = '';
    googleOtpMode = false;
    googleEmailOtpMode = false;
    googleCaptchaMode = false;
    applyAuthSuccess(data, 'Logged in with Google');
  } catch {
    showPopup('Google sign-in is unavailable right now.');
    resetRecaptchaByMode(activeAuthMode);
  }
}

async function renderRecaptcha(containerId, mode) {
  const key = await fetchRecaptchaSiteKey();
  if (!key) return false;

  await ensureRecaptchaScript();
  await new Promise(resolve => window.grecaptcha.ready(resolve));

  const container = document.getElementById(containerId);
  if (!container) return false;

  if (mode === 'login') {
    if (loginRecaptchaId !== null) {
      window.grecaptcha.reset(loginRecaptchaId);
      return true;
    }
    loginRecaptchaId = window.grecaptcha.render(containerId, { sitekey: key });
    return true;
  }

  if (signupRecaptchaId !== null) {
    window.grecaptcha.reset(signupRecaptchaId);
    return true;
  }
  signupRecaptchaId = window.grecaptcha.render(containerId, { sitekey: key });
  return true;
}

function getRecaptchaResponseByMode(mode) {
  if (!window.grecaptcha) return '';
  const widgetId = mode === 'login' ? loginRecaptchaId : signupRecaptchaId;
  if (widgetId === null || widgetId === undefined) return '';
  return window.grecaptcha.getResponse(widgetId) || '';
}

function resetRecaptchaByMode(mode) {
  if (!window.grecaptcha) return;
  const widgetId = mode === 'login' ? loginRecaptchaId : signupRecaptchaId;
  if (widgetId === null || widgetId === undefined) return;
  window.grecaptcha.reset(widgetId);
}

function showOtpStep(emailOtpMode = false) {
  const content = document.getElementById('authContent');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const footer = document.getElementById('authFooter');
  if (!content || !title || !subtitle || !footer) return;

  title.textContent = 'Verify Your Identity';
  subtitle.textContent = emailOtpMode
    ? 'A verification code has been sent to your email. Enter it below to complete sign-in.'
    : 'Enter the 6-digit code from your authenticator app.';

  content.innerHTML = `
    <form class="auth-form" id="otpStepForm">
      <div class="form-group mb-4">
        <label class="form-label" id="otpStepLabel">${emailOtpMode ? 'Email Verification Code' : 'Authenticator Code'}</label>
        <div class="input-icon">
          <input type="text" id="otpStepInput" class="form-control text-center fs-5"
            placeholder="000000" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required>
        </div>
      </div>
      <button type="submit" class="btn btn-primary w-100">Verify</button>
    </form>
  `;
  footer.innerHTML = `<span><a href="#" id="otpBackBtn">&#8592; Back to Login</a></span>`;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  const otpInput = document.getElementById('otpStepInput');
  if (otpInput) setTimeout(() => otpInput.focus(), 50);

  const backBtn = document.getElementById('otpBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', e => {
      e.preventDefault();
      pendingEmail = '';
      pendingPassword = '';
      googleIdToken = '';
      googleOtpMode = false;
      googleEmailOtpMode = false;
      googleCaptchaMode = false;
      loginRequiresOtp = false;
      loginRequiresCaptcha = false;
      showSignIn();
    });
  }

  const otpForm = document.getElementById('otpStepForm');
  if (!otpForm) return;

  otpForm.addEventListener('submit', async e => {
    e.preventDefault();
    const otpToken = (document.getElementById('otpStepInput')?.value || '').trim();
    if (!otpToken || otpToken.length !== 6) {
      showPopup('Please enter a valid 6-digit code.');
      return;
    }

    try {
      let endpoint, requestBody;

      if (googleOtpMode && googleIdToken) {
        endpoint = 'google';
        requestBody = { idToken: googleIdToken, otpToken, mfaMethod: 'totp' };
      } else if (googleEmailOtpMode && googleIdToken) {
        endpoint = 'google';
        requestBody = { idToken: googleIdToken, emailOtpToken: otpToken, mfaMethod: 'email' };
      } else if (emailOtpMode) {
        endpoint = 'login';
        requestBody = { email: pendingEmail, password: pendingPassword, emailOtpToken: otpToken, mfaMethod: 'email' };
      } else {
        endpoint = 'login';
        requestBody = { email: pendingEmail, password: pendingPassword, otpToken, mfaMethod: 'totp' };
      }

      const response = await fetchWithFallback(buildUserApiUrls(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        pendingEmail = '';
        pendingPassword = '';
        googleIdToken = '';
        googleOtpMode = false;
        googleEmailOtpMode = false;
        googleCaptchaMode = false;
        loginRequiresOtp = false;
        applyAuthSuccess(data, 'Logged in successfully');
        return;
      }

      if (response.status === 401 && (data.requiresOtp || data.requiresEmailOtp)) {
        // Wrong code — stay on OTP step so user can retry
        showPopup(data.message || 'Invalid code. Please try again.');
      } else if (response.status === 400 || response.status === 429) {
        // Expired or too many attempts — restart login
        const msg = data.message || 'Code expired or too many attempts. Please log in again.';
        pendingEmail = '';
        pendingPassword = '';
        googleIdToken = '';
        googleOtpMode = false;
        googleEmailOtpMode = false;
        googleCaptchaMode = false;
        loginRequiresOtp = false;
        showSignIn();
        showPopup(msg);
      } else {
        showPopup(data.message || 'Verification failed. Please try again.');
      }
    } catch {
      showPopup('Cannot connect to server.');
    }
  });
}

function applyLoginChallengeState({ requiresOtp = false, requiresCaptcha = false, message = '', emailOtpMode = false } = {}) {
  loginRequiresOtp = Boolean(requiresOtp);
  loginRequiresCaptcha = Boolean(requiresCaptcha);

  if (message) {
    showPopup(message);
  }

  if (loginRequiresOtp) {
    // Switch to the dedicated OTP step screen instead of inline field
    showOtpStep(emailOtpMode);
    return;
  }

  // Captcha-only challenge — show captcha widget inside the login form
  const captchaWrap = document.getElementById('loginRecaptchaWrap');
  const subtitle = document.getElementById('authSubtitle');

  // Remove `required` from email/password when in Google captcha challenge mode
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  if (emailInput) emailInput.required = !googleCaptchaMode;
  if (passwordInput) passwordInput.required = !googleCaptchaMode;

  if (captchaWrap) {
    captchaWrap.classList.toggle('d-none', !loginRequiresCaptcha);
  }

  if (subtitle) {
    subtitle.textContent = loginRequiresCaptcha
      ? 'Too many failed attempts detected. Please complete captcha and try again.'
      : 'Enter your credentials to access your account';
  }

  if (loginRequiresCaptcha && captchaWrap) {
    renderRecaptcha('loginRecaptcha', 'login').catch(() => {
      showPopup('Cannot load captcha. Please refresh page.');
    });
  }
}

function showMfaChoiceStep() {
  const content = document.getElementById('authContent');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const footer = document.getElementById('authFooter');
  if (!content || !title || !subtitle || !footer) return;

  title.textContent = 'Verify Your Identity';
  subtitle.textContent = 'Your account has two verification methods enabled. Please choose one to continue.';

  content.innerHTML = `
    <div class="mfa-choice-wrap">
      <button type="button" class="mfa-choice-btn" id="mfaChoiceTOTP">
        <span class="mfa-choice-icon"><i data-lucide="smartphone"></i></span>
        <span class="mfa-choice-text">
          <strong>Google Authenticator</strong>
          <span>Enter the 6-digit code from your authenticator app</span>
        </span>
        <i data-lucide="chevron-right" class="mfa-choice-arrow"></i>
      </button>
      <button type="button" class="mfa-choice-btn" id="mfaChoiceEmail">
        <span class="mfa-choice-icon"><i data-lucide="mail"></i></span>
        <span class="mfa-choice-text">
          <strong>Email Code</strong>
          <span>Receive a 6-digit code by email</span>
        </span>
        <i data-lucide="chevron-right" class="mfa-choice-arrow"></i>
      </button>
    </div>
  `;
  footer.innerHTML = `<span><a href="#" id="mfaChoiceBackBtn">&#8592; Back to Login</a></span>`;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  document.getElementById('mfaChoiceBackBtn')?.addEventListener('click', e => {
    e.preventDefault();
    pendingEmail = '';
    pendingPassword = '';
    googleIdToken = '';
    googleOtpMode = false;
    googleEmailOtpMode = false;
    googleCaptchaMode = false;
    loginRequiresOtp = false;
    showSignIn();
  });

  // TOTP selected — go directly to OTP entry (no network call needed)
  document.getElementById('mfaChoiceTOTP')?.addEventListener('click', () => {
    if (googleIdToken) {
      googleOtpMode = true;
      googleEmailOtpMode = false;
    }
    showOtpStep(false);
  });

  // Email selected — trigger server to send the email, then show OTP entry
  document.getElementById('mfaChoiceEmail')?.addEventListener('click', async () => {
    const btn = document.getElementById('mfaChoiceEmail');
    if (btn) btn.disabled = true;

    try {
      let endpoint, requestBody;
      if (googleIdToken) {
        endpoint = 'google';
        requestBody = { idToken: googleIdToken, mfaMethod: 'email' };
      } else {
        endpoint = 'login';
        requestBody = { email: pendingEmail, password: pendingPassword, mfaMethod: 'email' };
      }

      const response = await fetchWithFallback(buildUserApiUrls(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.requiresEmailOtp) {
        if (googleIdToken) {
          googleEmailOtpMode = true;
          googleOtpMode = false;
        }
        showOtpStep(true);
        if (data.message) showPopup(data.message);
      } else {
        if (btn) btn.disabled = false;
        showPopup(data.message || 'Failed to send verification email. Please try again.');
      }
    } catch {
      if (btn) btn.disabled = false;
      showPopup('Cannot connect to server.');
    }
  });
}

function toggleAuthPopup(event) {
  if (event) event.preventDefault();
  const existing = document.getElementById('authModal');
  if (existing) {
    closeAuthPopup();
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'authBackdrop';
  backdrop.className = 'auth-backdrop';
  backdrop.addEventListener('click', closeAuthPopup);

  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'auth-modal';

  const header = document.createElement('div');
  header.className = 'auth-header';
  const title = document.createElement('h2');
  title.id = 'authTitle';
  header.appendChild(title);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'auth-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeAuthPopup);
  header.appendChild(closeBtn);

  const subtitle = document.createElement('p');
  subtitle.id = 'authSubtitle';
  subtitle.className = 'auth-subtitle';

  const content = document.createElement('div');
  content.id = 'authContent';
  content.className = 'auth-content';

  const footer = document.createElement('div');
  footer.id = 'authFooter';
  footer.className = 'auth-footer';

  modal.appendChild(header);
  modal.appendChild(subtitle);
  modal.appendChild(content);
  modal.appendChild(footer);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  requestAnimationFrame(() => backdrop.classList.add('show'));
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  showSignIn();
}

function closeAuthPopup() {
  const modal = document.getElementById('authModal');
  const backdrop = document.getElementById('authBackdrop');
  if (modal) modal.remove();
  if (backdrop) {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 250);
  }
}

function attachPasswordToggle() {
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
      const input = icon.parentElement.querySelector('input');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });
}

function showSignIn() {
  const content = document.getElementById('authContent');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const footer = document.getElementById('authFooter');
  if (!content || !title || !subtitle || !footer) return;
  activeAuthMode = 'login';
  loginRequiresCaptcha = false;
  loginRequiresOtp = false;

  title.textContent = 'Log In';
  subtitle.textContent = 'Enter your credentials to access your account';
  content.innerHTML = `
    <form class="auth-form" id="loginForm">
      <div class="form-group mb-3">
        <label>Email</label>
        <div class="input-icon">
          <input type="email" id="loginEmail" class="form-control" placeholder="you@example.com" required>
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Password</label>
        <div class="input-icon password-wrapper">
          <input type="password" id="loginPassword" class="form-control" placeholder="••••••" required>
          <i data-lucide="eye" class="toggle-password"></i>
        </div>
      </div>
      <div class="form-group mb-3 d-none" id="loginRecaptchaWrap">
        <div id="loginRecaptcha"></div>
      </div>
      <button type="submit" class="btn btn-primary w-100">Log in</button>
      <div class="text-center mt-3 mb-2 text-muted">or</div>
      <div id="googleSignInLogin" class="d-flex justify-content-center"></div>
    </form>
  `;
  footer.innerHTML = `<span>Don't have an account? <a href="#" onclick="showSignUp()">Sign Up</a></span>`;
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  attachPasswordToggle();
  renderGoogleButton('googleSignInLogin', 'login').catch(() => {
    // Keep local login working if Google script fails.
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const emailVal = document.getElementById('loginEmail').value.trim();
      const passwordVal = document.getElementById('loginPassword').value.trim();
      const captchaToken = getRecaptchaResponseByMode('login');

      if (loginRequiresCaptcha && !captchaToken) {
        showPopup('Please verify captcha first.');
        return;
      }

      try {
        let endpoint, requestBody;

        if (googleCaptchaMode && googleIdToken) {
          // Captcha-only Google challenge — resubmit Google token with solved captcha
          endpoint = 'google';
          requestBody = { idToken: googleIdToken, captchaToken };
        } else {
          endpoint = 'login';
          requestBody = { email: emailVal, password: passwordVal, captchaToken };
        }

        const response = await fetchWithFallback(buildUserApiUrls(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.debug('[auth] login response', response.status, data);

        if (response.ok && data.token) {
          googleIdToken = '';
          googleCaptchaMode = false;
          applyAuthSuccess(data, 'Logged in successfully');
        } else if (data.requiresOtp) {
          pendingEmail = emailVal;
          pendingPassword = passwordVal;
          googleOtpMode = false;
          googleEmailOtpMode = false;
          googleCaptchaMode = false;
          applyLoginChallengeState({
            requiresOtp: true,
            requiresCaptcha: Boolean(data.requiresCaptcha),
            message: data.message || 'OTP is required to complete login.',
          });
        } else if (data.requiresEmailOtp) {
          pendingEmail = emailVal;
          pendingPassword = passwordVal;
          googleOtpMode = false;
          googleEmailOtpMode = false;
          googleCaptchaMode = false;
          applyLoginChallengeState({
            requiresOtp: true,
            requiresCaptcha: false,
            message: data.message || 'Check your email for a verification code.',
            emailOtpMode: true,
          });
        } else if (data.requiresMfaChoice) {
          pendingEmail = emailVal;
          pendingPassword = passwordVal;
          showMfaChoiceStep();
        } else if (data.requiresCaptcha) {
          googleCaptchaMode = false;
          applyLoginChallengeState({
            requiresCaptcha: true,
            message: data.message || 'Please complete the captcha.',
          });
          resetRecaptchaByMode('login');
        } else {
          googleIdToken = '';
          googleCaptchaMode = false;
          showPopup(data.message || 'Login failed');
          resetRecaptchaByMode('login');
        }
      } catch (err) {
        console.error(err);
        showPopup('Cannot connect to server.');
        resetRecaptchaByMode('login');
      }
    });
  }
}

function showSignUp() {
  const content = document.getElementById('authContent');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const footer = document.getElementById('authFooter');
  if (!content || !title || !subtitle || !footer) return;
  activeAuthMode = 'signup';

  title.textContent = 'Sign Up';
  subtitle.textContent = 'Create your account first. You can add address details later in Account Information.';
  content.innerHTML = `
    <form class="auth-form" id="signupForm">
      <div class="form-group mb-3">
        <label>Username</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="Choose a username" id="signupUsername" required>
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Email</label>
        <div class="input-icon">
          <input type="email" class="form-control" placeholder="you@example.com" id="signupEmail" required>
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Password</label>
        <div class="input-icon password-wrapper">
          <input type="password" class="form-control" placeholder="••••••" id="signupPassword" required>
          <i data-lucide="eye" class="toggle-password"></i>
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Confirm Password</label>
        <div class="input-icon password-wrapper">
          <input type="password" class="form-control" placeholder="••••••" id="signupConfirmPassword" required>
          <i data-lucide="eye" class="toggle-password"></i>
        </div>
      </div>
      <div class="form-group mb-3">
        <div id="signupRecaptcha"></div>
      </div>
      <button type="submit" class="btn btn-success w-100">Create account</button>
      <div class="text-center mt-3 mb-2 text-muted">or</div>
      <div id="googleSignInSignup" class="d-flex justify-content-center"></div>
    </form>
  `;
  footer.innerHTML = `<span>Already have an account? <a href="#" onclick="showSignIn()">Log In</a></span>`;
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  attachPasswordToggle();
  renderRecaptcha('signupRecaptcha', 'signup').catch(() => {
    showPopup('Cannot load captcha. Please refresh page.');
  });
  renderGoogleButton('googleSignInSignup', 'signup').catch(() => {
    // Keep local signup working if Google script fails.
  });

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const u = document.getElementById('signupUsername').value.trim();
      const em = document.getElementById('signupEmail').value.trim();
      const pw = document.getElementById('signupPassword').value.trim();
      const confirmPw = document.getElementById('signupConfirmPassword').value.trim();
      const captchaToken = getRecaptchaResponseByMode('signup');

      if (pw !== confirmPw) {
        showPopup('Confirm Password does not match');
        return;
      }

      if (!captchaToken) {
        showPopup('Please verify captcha first.');
        return;
      }

      try {
        const response = await fetchWithFallback(buildUserApiUrls('register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, email: em, password: pw, captchaToken })
        });

        const data = await response.json();

        if (response.ok) {
          applyAuthSuccess(data, 'Account created successfully! Add your address in Account Information.');
        } else {
          showPopup(data.message || 'Registration failed');
          resetRecaptchaByMode('signup');
        }
      } catch (err) {
        console.error('Connection error:', err);
        showPopup('Cannot connect to server.');
        resetRecaptchaByMode('signup');
      }
    });
  }
}

// Ensure popup functions are always reachable from other scripts and inline handlers.
window.toggleAuthPopup = toggleAuthPopup;
window.closeAuthPopup = closeAuthPopup;
window.showSignIn = showSignIn;
window.showSignUp = showSignUp;
window.showMfaChoiceStep = showMfaChoiceStep;

