// Toggle Dark/Light Mode
const navbarTop = document.getElementById('navbarTop');
const toggleBtn = document.getElementById('toggleTheme');
const background = document.querySelector('.background');
const floatingMenu = document.querySelector('.floating-menu');
const themeIcon = document.getElementById('themeIcon');
let lastScrollY = window.scrollY;

// storage helper functions (currently backed by localStorage, replace with real DB later)
function getAuthState() {
  // TODO: query server/session
  return localStorage.getItem('isLoggedIn') === 'true';
}
function setAuthState(val) {
  // TODO: send to server
  if (val) localStorage.setItem('isLoggedIn', 'true');
  else localStorage.removeItem('isLoggedIn');
}
function getProfile() {
  try {
    return JSON.parse(localStorage.getItem('profile') || '{}');
  } catch {
    return {};
  }
}
function saveProfile(p) {
  // TODO: send to server
  localStorage.setItem('profile', JSON.stringify(p));
}
function getBuild() {
  try { return JSON.parse(localStorage.getItem('pcBuild')||'{}'); } catch { return {}; }
}
function saveBuild(b) {
  // TODO: persist to database
  localStorage.setItem('pcBuild', JSON.stringify(b));
}
function getBuildName() {
  return localStorage.getItem('buildName') || '';
}
function saveBuildName(name) {
  localStorage.setItem('buildName', name);
}

// load authentication state from storage
window.isLoggedIn = getAuthState();

// welcome message updater
function updateWelcomeMessage() {
  const msg = document.getElementById('welcomeMsg');
  if (!msg) return;
  if (!window.isLoggedIn) {
    msg.textContent = '';
    return;
  }
  const profile = getProfile();
  const name = profile.username || profile.fullName || 'User';
  msg.textContent = `Welcome "${name}"!`;
}

// global logout helper
function logout() {
  window.isLoggedIn = false;
  setAuthState(false);
  if (window.updateAccountDropdown) window.updateAccountDropdown();
  if (window.updateWelcomeMessage) window.updateWelcomeMessage();
  // if on account page, redirect to home
  if (window.location.pathname.endsWith('account.html')) {
    window.location.href = 'index.html';
    return; // navigation will reload the page
  }
  // otherwise, simply refresh to update UI
  location.reload();
}

// navigation helper for account link
function goToAccount(event) {
  event.preventDefault();
  if (window.isLoggedIn) {
    window.location.href = 'account.html';
  } else {
    // not logged in: show login popup and remember where to go afterwards
    window.redirectAfterLogin = 'account.html';
    toggleAuthPopup(event);
  }
}

// dropdown toggle for floating menu account
function initAccountDropdown() {
  const wrapper = document.querySelector('.account-wrapper');
  if (!wrapper) return;
  const dropdown = wrapper.querySelector('.account-dropdown');

  // make sure wrapper reflects login state
  function refreshWrapper() {
    if (window.isLoggedIn) wrapper.classList.add('logged-in');
    else wrapper.classList.remove('logged-in');
  }
  refreshWrapper();

  // if not logged in, click opens auth popup instead
  wrapper.addEventListener('click', e => {
    e.stopPropagation();
    if (!window.isLoggedIn) {
      toggleAuthPopup(e);
      return;
    }
    dropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('show');
  });

  // expose function to update from elsewhere
  window.updateAccountDropdown = refreshWrapper;
}

// call init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initAccountDropdown();
  updateWelcomeMessage();   // ensure greeting persists across pages
});


toggleBtn.addEventListener('click', (e) => {
  // create ripple effect from button location
  const rect = toggleBtn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const ripple = document.createElement('div');
  ripple.className = 'mode-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  document.body.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());

  //Toggle body Classes
  document.body.classList.toggle('bg-dark');
  document.body.classList.toggle('text-white');
  document.body.classList.toggle('bg-light');
  document.body.classList.toggle('text-dark');

  //Toggle Navbar Classes
  navbarTop.classList.toggle('bg-dark');
  navbarTop.classList.toggle('navbar-dark');


  const isDark = document.body.classList.contains('bg-dark');
  if (isDark) {
    themeIcon.setAttribute("data-lucide", "moon");
  } else {
    themeIcon.setAttribute("data-lucide", "sun");
  }

  lucide.createIcons();
});

// hide/show floating menu on scroll
window.addEventListener('scroll', () => {
  if (!floatingMenu) return;
  const compMenu = document.getElementById('componentsMenu');
  const authModal = document.getElementById('authModal');
  if (window.scrollY > lastScrollY) {
    floatingMenu.classList.add('hidden');
    if (compMenu) compMenu.classList.add('hidden');
    if (authModal) closeAuthPopup();
  } else {
    floatingMenu.classList.remove('hidden');
    if (compMenu) compMenu.classList.remove('hidden');
  }
  lastScrollY = window.scrollY;
});

var typing = new Typed('.typing', {
  strings: [
    '<span style ="color: #00f7ff">Compatibility</span>',
    '<span style ="color: #2af355">Price Comparison</span>',
    '<span style ="color: #00a2ff">User Reviews</span>',
  ],
  typeSpeed: 80,
  backSpeed: 50,
  loop: true
});
