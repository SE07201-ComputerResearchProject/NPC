// auth-popup.js - handles authentication UI

const USER_API_BASE_URL = 'http://localhost:3000/api/users';
const PUBLIC_CONFIG_API_URL = 'http://localhost:3000/api/config/public';
let recaptchaSiteKey = '';
let googleClientId = '';
let recaptchaScriptPromise = null;
let googleScriptPromise = null;
let googleInitialized = false;
let activeAuthMode = 'login';
let loginRecaptchaId = null;
let signupRecaptchaId = null;

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
    const response = await fetch(PUBLIC_CONFIG_API_URL);
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
    const key = recaptchaSiteKey || (await fetchRecaptchaSiteKey());
    if (key && !captchaToken) {
      showPopup('Please verify captcha first.');
      return;
    }

    const res = await fetch(`${USER_API_BASE_URL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, captchaToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      showPopup(data.message || 'Google sign-in failed');
      resetRecaptchaByMode(activeAuthMode);
      return;
    }

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
  if (window.lucide) lucide.createIcons();

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
      <div class="form-group mb-3">
        <div id="loginRecaptcha"></div>
      </div>
      <button type="submit" class="btn btn-primary w-100">Log in</button>
      <div class="text-center mt-3 mb-2 text-muted">or</div>
      <div id="googleSignInLogin" class="d-flex justify-content-center"></div>
    </form>
  `;
  footer.innerHTML = `<span>Don't have an account? <a href="#" onclick="showSignUp()">Sign Up</a></span>`;
  lucide.createIcons();
  attachPasswordToggle();
  renderRecaptcha('loginRecaptcha', 'login').catch(() => {
    showPopup('Cannot load captcha. Please refresh page.');
  });
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

      if (!captchaToken) {
        showPopup('Please verify captcha first.');
        return;
      }

      try {
        const response = await fetch(`${USER_API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, password: passwordVal, captchaToken })
        });
        
        const data = await response.json();

        if (response.ok) {
          applyAuthSuccess(data, 'Logged in successfully');
        } else {
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
  lucide.createIcons();
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
        const response = await fetch(`${USER_API_BASE_URL}/register`, {
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

