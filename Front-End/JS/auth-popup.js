// auth-popup.js - handles authentication UI

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
      <button type="submit" class="btn btn-primary w-100">Log in</button>
    </form>
  `;
  footer.innerHTML = `<span>Don't have an account? <a href="#" onclick="showSignUp()">Sign Up</a></span>`;
  lucide.createIcons();
  attachPasswordToggle();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const emailVal = document.getElementById('loginEmail').value.trim();
      const passwordVal = document.getElementById('loginPassword').value.trim();

      try {
        const response = await fetch('http://localhost:3000/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, password: passwordVal })
        });
        
        const data = await response.json();

        if (response.ok) {
          let profile = { 
            userId: data.user.id,
            username: data.user.username, 
            email: data.user.email,
            fullName: data.user.fullName,
            dateOfBirth: data.user.dateOfBirth,
            address: data.user.address
          };
          saveProfile(profile);
          localStorage.setItem('userId', data.user.id);
          window.isLoggedIn = true;
          setAuthState(true);
          closeAuthPopup();
          showPopup('Logged in successfully');
          if (window.updateAccountDropdown) window.updateAccountDropdown();
          if (window.updateWelcomeMessage) window.updateWelcomeMessage();
        } else {
          showPopup(data.message || 'Login failed');
        }
      } catch (err) {
        console.error(err);
        showPopup('Cannot connect to server.');
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
          <input type="text" class="form-control" placeholder="Choose a username" id="signupUsername" required>
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Full Name</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="Your full name" id="signupFullName">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Date of Birth</label>
        <div class="input-icon">
          <input type="date" class="form-control" id="signupDob">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>Street</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="123 Main St" id="signupStreet">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>City</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="City" id="signupCity">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>State</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="State" id="signupState">
        </div>
      </div>
      <div class="form-group mb-3">
        <label>ZIP</label>
        <div class="input-icon">
          <input type="text" class="form-control" placeholder="ZIP" id="signupZip">
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
      <button type="submit" class="btn btn-success w-100">Create account</button>
    </form>
  `;
  footer.innerHTML = `<span>Already have an account? <a href="#" onclick="showSignIn()">Log In</a></span>`;
  lucide.createIcons();
  attachPasswordToggle();

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const u = document.getElementById('signupUsername').value.trim();
      const em = document.getElementById('signupEmail').value.trim();
      const pw = document.getElementById('signupPassword').value.trim();

      try {
        const response = await fetch('http://localhost:3000/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, email: em, password: pw })
        });

        const data = await response.json();

        if (response.ok) {
          const profile = { 
            userId: data.user.id,
            username: data.user.username, 
            email: data.user.email,
            fullName: data.user.fullName,
            dateOfBirth: data.user.dateOfBirth,
            address: data.user.address
          };
          saveProfile(profile);
          localStorage.setItem('userId', data.user.id);
          window.isLoggedIn = true;
          setAuthState(true);
          closeAuthPopup();
          showPopup('Account created successfully!');
          if (window.updateAccountDropdown) window.updateAccountDropdown();
          if (window.updateWelcomeMessage) window.updateWelcomeMessage();
        } else {
          showPopup(data.message || 'Registration failed');
        }
      } catch (err) {
        console.error('Connection error:', err);
        showPopup('Cannot connect to server.');
      }
    });
  }
}

