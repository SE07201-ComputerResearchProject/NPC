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
function getAuthToken() {
  return localStorage.getItem('authToken') || '';
}
function setAuthToken(token) {
  if (token) localStorage.setItem('authToken', token);
  else localStorage.removeItem('authToken');
}
function getProfile() {
  try {
    return JSON.parse(localStorage.getItem('profile') || '{}');
  } catch {
    return {};
  }
}

function getCurrentUserRole() {
  const profile = getProfile();
  return (profile.role || 'user').toLowerCase();
}

async function hydrateProfileRoleIfMissing() {
  if (!window.isLoggedIn) return;

  const profile = getProfile();
  if (profile.role) return;

  const userId = profile.userId || localStorage.getItem('userId');
  if (!userId) return;

  try {
    const response = await fetch(`http://localhost:3000/api/users/${userId}`);
    if (!response.ok) return;

    const user = await response.json();
    const normalized = user && user.user ? user.user : user;
    saveProfile({
      ...profile,
      ...normalized,
      userId: normalized._id || normalized.id || userId,
      role: normalized.role || 'user',
    });

    if (window.updateAccountDropdown) window.updateAccountDropdown();
    if (window.updateWelcomeMessage) window.updateWelcomeMessage();
  } catch {
    // Best effort only; role can still be updated by next login/account load.
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

function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('shoppingCart') || '[]');
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem('shoppingCart', JSON.stringify(Array.isArray(items) ? items : []));
}

function addToCart(component) {
  if (!component || !component._id) return;

  const cart = getCart();
  const idx = cart.findIndex(item => item._id === component._id);

  if (idx >= 0) {
    cart[idx].quantity = Number(cart[idx].quantity || 1) + 1;
  } else {
    cart.push({
      _id: component._id,
      category: component.category,
      name: component.name,
      brand: component.brand || '',
      price: Number(component.price || 0),
      power: Number(component.power || 0),
      quantity: 1,
    });
  }

  saveCart(cart);
}

function removeFromCart(componentId) {
  const cart = getCart().filter(item => item._id !== componentId);
  saveCart(cart);
}

function updateCartQuantity(componentId, quantity) {
  const safeQty = Math.max(1, Number(quantity) || 1);
  const cart = getCart().map(item => {
    if (item._id !== componentId) return item;
    return { ...item, quantity: safeQty };
  });
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

// theme persistence helpers
function getTheme() {
  return localStorage.getItem('theme') || 'light';
}
function saveTheme(theme) {
  localStorage.setItem('theme', theme);
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('bg-dark', isDark);
  document.body.classList.toggle('text-white', isDark);
  document.body.classList.toggle('bg-light', !isDark);
  document.body.classList.toggle('text-dark', !isDark);

  navbarTop.classList.toggle('bg-dark', isDark);
  navbarTop.classList.toggle('navbar-dark', isDark);

  // icon indicates the opposite theme (clicking will switch to it)
  if (isDark) {
    themeIcon.setAttribute('data-lucide', 'sun');
  } else {
    themeIcon.setAttribute('data-lucide', 'moon');
  }
  
  // reinitialize the icon right away, not all icons
  if (window.lucide) {
    lucide.createIcons({ els: [themeIcon] });
  }
}

// load authentication state from storage
window.isLoggedIn = getAuthState();

// generic pop-up notification helper
// options: {duration, center, onClick}
function showPopup(msg, options = {}) {
  const { duration = 2000, center = false, onClick = null } = options;
  const existing = document.getElementById('popupNotification');
  if (existing) {
    existing.remove();
  }
  const div = document.createElement('div');
  div.id = 'popupNotification';
  div.className = 'popup-notification' + (center ? ' center' : '');
  div.textContent = msg;
  if (typeof onClick === 'function') {
    div.style.cursor = 'pointer';
    div.addEventListener('click', () => {
      onClick();
      div.remove();
    });
  }
  document.body.appendChild(div);
  requestAnimationFrame(() => div.classList.add('show'));
  setTimeout(() => {
    div.classList.remove('show');
    setTimeout(() => div.remove(), 300);
  }, duration);
}

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
  setAuthToken(null);
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
    if (getCurrentUserRole() === 'admin') {
      window.location.href = 'admin.html';
      return;
    }
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
  if (!dropdown) return;
  const accountInfoLink = dropdown.querySelector('a[onclick*="goToAccount"]');

  let adminLink = dropdown.querySelector('.admin-only-link');
  if (!adminLink) {
    adminLink = document.createElement('a');
    adminLink.className = 'admin-only-link';
    adminLink.href = 'admin.html';
    adminLink.textContent = 'Admin Panel';
    dropdown.insertBefore(adminLink, dropdown.firstChild);
  }

  // make sure wrapper reflects login state
  function refreshWrapper() {
    if (window.isLoggedIn) wrapper.classList.add('logged-in');
    else wrapper.classList.remove('logged-in');

    const isAdmin = window.isLoggedIn && getCurrentUserRole() === 'admin';
    adminLink.style.display = isAdmin ? 'block' : 'none';

    if (accountInfoLink) {
      accountInfoLink.style.display = isAdmin ? 'none' : 'block';
    }
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
  // restore last theme choice
  applyTheme(getTheme());
  hydrateProfileRoleIfMissing();
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

  // determine new theme and apply
  const currentlyDark = document.body.classList.contains('bg-dark');
  const newTheme = currentlyDark ? 'light' : 'dark';
  applyTheme(newTheme);
  saveTheme(newTheme);
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

if (window.Typed && document.querySelector('.typing')) {
  new Typed('.typing', {
    strings: [
      '<span style ="color: #00f7ff">Compatibility</span>',
      '<span style ="color: #2af355">Price Comparison</span>',
      '<span style ="color: #00a2ff">User Reviews</span>',
    ],
    typeSpeed: 80,
    backSpeed: 50,
    loop: true,
  });
}
