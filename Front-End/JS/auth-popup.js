// Authentication popup (sign-in / sign-up)
function toggleAuthPopup(event) {
  event.preventDefault();
  const existing = document.getElementById('authModal');
  if (existing) {
    closeAuthPopup();
    return;
  }

  // create backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'authBackdrop';
  backdrop.className = 'auth-backdrop';
  backdrop.addEventListener('click', closeAuthPopup);

  // create modal container
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'auth-modal';

  // header with title and close button
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

  // subtitle/message
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
  // trigger fade-in
  requestAnimationFrame(() => backdrop.classList.add('show'));
  lucide.createIcons(); // render any icons (social buttons etc.)

  showSignIn(); // default view
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

function showSignIn() {
  const content = document.getElementById('authContent');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const footer = document.getElementById('authFooter');
  if (!content || !title || !subtitle || !footer) return;
  title.textContent = 'Log In';
  subtitle.textContent = 'Enter your credentials to access your account';
  content.innerHTML = `
    <form class="auth-form" id="loginForm">
      <div class="form-group mb-3">
        <label>Email</label>
        <div class="input-icon">
          <input type="email" class="form-control" placeholder="you@example.com">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Password</label>
        <div class="input-icon password-wrapper">
          <input type="password" class="form-control" placeholder="••••••">
          <i data-lucide="eye" class="toggle-password"></i>
        </div>
      </div>
      <button class="btn btn-primary w-100">Log in</button>
    </form>
  `;
  footer.innerHTML = `
    <span>Don't have an account? <a href="#" onclick="showSignUp()">Sign Up</a></span>
  `;
  lucide.createIcons();
  attachPasswordToggle();

  // intercept submit to mark authenticated; also ensure username exists
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const emailInput = document.getElementById('loginEmail');
      const emailVal = emailInput ? emailInput.value.trim() : '';
      let profile = getProfile();
      if (!profile.username && emailVal) {
        profile.username = emailVal.split('@')[0];
        saveProfile(profile);
      }
      window.isLoggedIn = true;
      setAuthState(true);
      closeAuthPopup();
      alert('Logged in successfully');
      if (window.updateAccountDropdown) window.updateAccountDropdown();
      if (window.updateWelcomeMessage) window.updateWelcomeMessage();
      if (window.redirectAfterLogin) {
        window.location.href = window.redirectAfterLogin;
        delete window.redirectAfterLogin;
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
  title.textContent = 'Sign Up';
  subtitle.textContent = 'Save your builds and interact with the community!';
  content.innerHTML = `
    <form class="auth-form" id="signupForm">
      <div class="form-group mb-3">
        <label>Username</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="Choose a username" id="signupUsername">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Name</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="Your name" id="signupName">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Email</label>
        <div class="input-icon">
          <input type="email" class="form-control" placeholder="you@example.com" id="signupEmail">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Password</label>
        <div class="input-icon password-wrapper">
          <input type="password" class="form-control" placeholder="••••••">
          <i data-lucide="eye" class="toggle-password"></i>
        </div>
      </div>
      <button class="btn btn-success w-100">Create account</button>
    </form>
  `;
  footer.innerHTML = `
    <span>Already have an account? <a href="#" onclick="showSignIn()">Log In</a></span>
  `;
  lucide.createIcons();
  attachPasswordToggle();

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', e => {
      e.preventDefault();
      // gather signup details
      const u = document.getElementById('signupUsername')?.value.trim() || '';
      const n = document.getElementById('signupName')?.value.trim() || '';
      const em = document.getElementById('signupEmail')?.value.trim() || '';
      const profile = { username: u, fullName: n, email: em };
      saveProfile(profile);
      window.isLoggedIn = true;
      setAuthState(true);
      closeAuthPopup();
      alert('Account created and logged in');
      if (window.updateAccountDropdown) window.updateAccountDropdown();
      if (window.updateWelcomeMessage) window.updateWelcomeMessage();
      if (window.redirectAfterLogin) {
        window.location.href = window.redirectAfterLogin;
        delete window.redirectAfterLogin;
      }
    });
  }
}

function attachPasswordToggle() {
  const toggles = document.querySelectorAll('.toggle-password');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });
}
