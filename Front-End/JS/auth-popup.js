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

  const header = document.createElement('div');
  header.className = 'auth-header';
  header.textContent = 'Welcome';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'auth-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeAuthPopup);
  header.appendChild(closeBtn);

  const buttons = document.createElement('div');
  buttons.className = 'auth-buttons';
  const signInBtn = document.createElement('button');
  signInBtn.textContent = 'Sign In';
  signInBtn.addEventListener('click', showSignIn);
  const signUpBtn = document.createElement('button');
  signUpBtn.textContent = 'Sign Up';
  signUpBtn.addEventListener('click', showSignUp);
  buttons.appendChild(signInBtn);
  buttons.appendChild(signUpBtn);

  const content = document.createElement('div');
  content.id = 'authContent';
  content.className = 'auth-content';

  modal.appendChild(header);
  modal.appendChild(buttons);
  modal.appendChild(content);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  showSignIn(); // default view
}

function closeAuthPopup() {
  const modal = document.getElementById('authModal');
  const backdrop = document.getElementById('authBackdrop');
  if (modal) modal.remove();
  if (backdrop) backdrop.remove();
}

function showSignIn() {
  const content = document.getElementById('authContent');
  if (!content) return;
  content.innerHTML = `
    <form class="auth-form">
      <div class="mb-3">
        <label>Email</label>
        <input type="email" class="form-control" placeholder="you@example.com">
      </div>
      <div class="mb-3">
        <label>Password</label>
        <input type="password" class="form-control" placeholder="••••••">
      </div>
      <button class="btn btn-primary w-100">Sign In</button>
    </form>
  `;
}

function showSignUp() {
  const content = document.getElementById('authContent');
  if (!content) return;
  content.innerHTML = `
    <form class="auth-form">
      <div class="mb-3">
        <label>Name</label>
        <input type="text" class="form-control" placeholder="Your name">
      </div>
      <div class="mb-3">
        <label>Email</label>
        <input type="email" class="form-control" placeholder="you@example.com">
      </div>
      <div class="mb-3">
        <label>Password</label>
        <input type="password" class="form-control" placeholder="••••••">
      </div>
      <button class="btn btn-success w-100">Sign Up</button>
    </form>
  `;
}