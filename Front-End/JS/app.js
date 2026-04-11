// Toggle Dark/Light Mode
const navbarTop = document.getElementById('navbarTop');
const toggleBtn = document.getElementById('toggleTheme');
const background = document.querySelector('.background');
const floatingMenu = document.querySelector('.floating-menu');
let lastScrollY = window.scrollY;

const API_BASE_URL = 'http://127.0.0.1:3001/api';
const CART_API_URL = `${API_BASE_URL}/carts/me`;
const BUILD_API_URL = `${API_BASE_URL}/builds/me/current`;
const ORDER_API_URL = `${API_BASE_URL}/orders`;
const COMMERCE_BUILD_CATEGORIES = ['case', 'cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'cooler', 'fan'];
const LEGACY_COMMERCE_STORAGE_KEYS = ['pcBuild', 'shoppingCart', 'buildName'];
const GUEST_BUILD_STORAGE_KEY = 'guestPcBuild';
const GUEST_BUILD_NAME_STORAGE_KEY = 'guestBuildName';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const commerceState = {
  cart: [],
  build: createEmptyBuildState(),
  buildName: 'New Build',
};

// Auth/profile/theme state helpers remain in localStorage.
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

function createEmptyBuildState() {
  return {
    case: null,
    cpu: null,
    motherboard: null,
    gpu: null,
    ram: null,
    storage: null,
    psu: null,
    cooler: null,
    fan: null,
  };
}

function cloneStateValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanupLegacyCommerceStorage() {
  LEGACY_COMMERCE_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
}

function readGuestBuildFromStorage() {
  try {
    const rawBuild = JSON.parse(localStorage.getItem(GUEST_BUILD_STORAGE_KEY) || '{}');
    return normalizeBuildForState(rawBuild);
  } catch {
    return createEmptyBuildState();
  }
}

function readGuestBuildNameFromStorage() {
  const value = localStorage.getItem(GUEST_BUILD_NAME_STORAGE_KEY) || 'New Build';
  return String(value).trim() || 'New Build';
}

function persistGuestBuildState() {
  localStorage.setItem(GUEST_BUILD_STORAGE_KEY, JSON.stringify(commerceState.build));
  localStorage.setItem(GUEST_BUILD_NAME_STORAGE_KEY, commerceState.buildName || 'New Build');
}

function normalizeCartItemsForState(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(item => {
      if (!item || typeof item !== 'object') return null;

      const id = item._id || item.componentId || '';
      const category = item.category || '';
      const name = item.name || '';
      if (!category || !name) return null;

      return {
        _id: String(id),
        category,
        name,
        brand: item.brand || '',
        price: Number(item.price || 0),
        power: Number(item.power || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
      };
    })
    .filter(Boolean);
}

function normalizeBuildForState(build) {
  const normalized = createEmptyBuildState();

  COMMERCE_BUILD_CATEGORIES.forEach(category => {
    const part = build?.[category];
    if (!part || typeof part !== 'object') {
      normalized[category] = null;
      return;
    }

    normalized[category] = {
      _id: String(part._id || part.componentId || ''),
      category: part.category || category,
      name: part.name || '',
      brand: part.brand || '',
      price: Number(part.price || 0),
      power: Number(part.power || 0),
      imageUrl: part.imageUrl || '',
      description: part.description || '',
    };
  });

  return normalized;
}

function getAuthHeaders(baseHeaders = {}) {
  const token = getAuthToken();
  if (!token) return { ...baseHeaders };

  return {
    ...baseHeaders,
    Authorization: `Bearer ${token}`,
  };
}

async function requestAuthJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: getAuthHeaders(options.headers || {}),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed: ${response.status}`);
  }

  return payload;
}

function resetCommerceState() {
  commerceState.cart = [];
  commerceState.build = createEmptyBuildState();
  commerceState.buildName = 'New Build';
}

async function hydrateCommerceState() {
  cleanupLegacyCommerceStorage();

  if (!getAuthToken()) {
    commerceState.cart = [];
    commerceState.build = readGuestBuildFromStorage();
    commerceState.buildName = readGuestBuildNameFromStorage();
    return cloneStateValue(commerceState);
  }

  const [cartPayload, buildPayload] = await Promise.all([
    requestAuthJson(CART_API_URL).catch(() => ({ items: [] })),
    requestAuthJson(BUILD_API_URL).catch(() => ({ name: 'New Build', parts: createEmptyBuildState() })),
  ]);

  commerceState.cart = normalizeCartItemsForState(cartPayload?.items || []);
  commerceState.build = normalizeBuildForState(buildPayload?.parts || {});
  commerceState.buildName = String(buildPayload?.name || 'New Build').trim() || 'New Build';

  return cloneStateValue(commerceState);
}

async function awaitCommerceStateReady() {
  try {
    await window.commerceStateReady;
  } catch {
    // Keep the UI usable even if the initial sync fails.
  }

  return cloneStateValue(commerceState);
}

async function persistCartState() {
  if (!getAuthToken()) {
    return { persisted: false, items: getCart() };
  }

  const payload = await requestAuthJson(CART_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: commerceState.cart }),
  });

  commerceState.cart = normalizeCartItemsForState(payload?.cart?.items || commerceState.cart);
  return payload;
}

async function persistBuildState() {
  if (!getAuthToken()) {
    persistGuestBuildState();
    return { persisted: false, build: { name: getBuildName(), parts: getBuild() } };
  }

  const payload = await requestAuthJson(BUILD_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: commerceState.buildName || 'New Build',
      parts: commerceState.build,
    }),
  });

  commerceState.build = normalizeBuildForState(payload?.build?.parts || commerceState.build);
  commerceState.buildName = String(payload?.build?.name || commerceState.buildName || 'New Build').trim() || 'New Build';
  return payload;
}

async function createCheckoutOrder(source, shippingAddress, voucherCode = '') {
  return requestAuthJson(`${ORDER_API_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, shippingAddress, voucherCode }),
  });
}

window.commerceStateReady = hydrateCommerceState();
window.hydrateCommerceState = async () => {
  window.commerceStateReady = hydrateCommerceState();
  return window.commerceStateReady;
};
window.awaitCommerceStateReady = awaitCommerceStateReady;
window.requestAuthJson = requestAuthJson;
window.createCheckoutOrder = createCheckoutOrder;
window.getAuthToken = getAuthToken;
window.getAuthHeaders = getAuthHeaders;
window.getBuild = getBuild;
window.saveBuild = saveBuild;
window.getBuildName = getBuildName;
window.saveBuildName = saveBuildName;
window.getCart = getCart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.clearCart = clearCart;
window.showPopup = showPopup;

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

  try {
    const token = getAuthToken();
    if (!token) return;

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`${API_BASE_URL}/users/me`, { headers });
    if (!response.ok) return;

    const user = await response.json();
    const normalized = user && user.user ? user.user : user;
    saveProfile({
      ...profile,
      ...normalized,
      userId: normalized._id || normalized.id || profile.userId || localStorage.getItem('userId'),
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
  return cloneStateValue(commerceState.build);
}
async function saveBuild(b) {
  commerceState.build = normalizeBuildForState(b);
  return persistBuildState();
}
function getBuildName() {
  return commerceState.buildName || 'New Build';
}
async function saveBuildName(name) {
  commerceState.buildName = String(name || 'New Build').trim() || 'New Build';
  return persistBuildState();
}

function getCart() {
  return cloneStateValue(commerceState.cart);
}

async function saveCart(items) {
  commerceState.cart = normalizeCartItemsForState(items);
  return persistCartState();
}

async function addToCart(component) {
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

  return saveCart(cart);
}

async function removeFromCart(componentId) {
  const cart = getCart().filter(item => item._id !== componentId);
  return saveCart(cart);
}

async function updateCartQuantity(componentId, quantity) {
  const safeQty = Math.max(1, Number(quantity) || 1);
  const cart = getCart().map(item => {
    if (item._id !== componentId) return item;
    return { ...item, quantity: safeQty };
  });
  return saveCart(cart);
}

async function clearCart() {
  commerceState.cart = [];

  if (!getAuthToken()) {
    return { persisted: false, items: [] };
  }

  return requestAuthJson(CART_API_URL, {
    method: 'DELETE',
  });
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

  if (navbarTop) {
    navbarTop.classList.toggle('bg-dark', isDark);
    navbarTop.classList.toggle('navbar-dark', isDark);
    navbarTop.classList.toggle('navbar-light', !isDark);
    navbarTop.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  // icon indicates the opposite theme (clicking will switch to it)
  if (toggleBtn) {
    const nextThemeIcon = isDark ? 'sun' : 'moon';
    // Recreate icon host so Lucide can render a fresh SVG every toggle.
    toggleBtn.innerHTML = `<i id="themeIcon" data-lucide="${nextThemeIcon}"></i>`;
  }
  
  // Re-render icons after replacing the toggle icon host element.
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Load authentication state from token to avoid stale `isLoggedIn=true` without a valid session token.
window.isLoggedIn = Boolean(getAuthToken());
if (!window.isLoggedIn) {
  setAuthState(false);
}

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
  resetCommerceState();
  cleanupLegacyCommerceStorage();
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
    if (typeof window.toggleAuthPopup === 'function') {
      window.toggleAuthPopup(event);
    } else {
      showPopup('Auth popup is not ready yet. Please refresh the page.');
    }
  }
}

// dropdown toggle for floating menu account
function initAccountDropdown() {
  const wrapper = document.querySelector('.account-wrapper');
  if (!wrapper) return;
  const dropdown = wrapper.querySelector('.account-dropdown');
  if (!dropdown) return;
  const trigger = wrapper.querySelector(':scope > .menu-item') || wrapper;
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
  trigger.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.isLoggedIn) {
      if (typeof toggleAuthPopup === 'function') {
        toggleAuthPopup(e);
      } else {
        showPopup('Auth popup is not ready yet. Please refresh the page.');
      }
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

// Fallback delegated click handler: if account trigger is clicked while logged out,
// force open auth popup even if page-specific listeners fail to initialize.
document.addEventListener('click', event => {
  const trigger = event.target.closest('.account-wrapper > .menu-item');
  if (!trigger) return;
  if (window.isLoggedIn) return;

  event.preventDefault();
  event.stopPropagation();
  if (typeof window.toggleAuthPopup === 'function') {
    window.toggleAuthPopup(event);
  }
});


if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    // determine new theme and apply
    const currentlyDark = document.body.classList.contains('bg-dark');
    const newTheme = currentlyDark ? 'light' : 'dark';
    applyTheme(newTheme);
    saveTheme(newTheme);
  });
}

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
