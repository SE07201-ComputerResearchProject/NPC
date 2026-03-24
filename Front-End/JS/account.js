// account.js - handle account profile page (sidebar layout)

const APP_CONFIG = window.APP_CONFIG || {};
const ACCOUNT_USER_API_BASE_URL = APP_CONFIG.USERS_API || 'http://localhost:3001/api/users';
const CURRENT_USER_API_URL = `${ACCOUNT_USER_API_BASE_URL}/me`;
const MAX_AVATAR_FILE_MB = 2;

// ── Auth helpers ────────────────────────────────────────────────────────────

function buildAuthHeaders(baseHeaders = {}) {
  const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('authToken') || '');
  if (!token) return baseHeaders;
  return { ...baseHeaders, Authorization: `Bearer ${token}` };
}

function normalizeUserPayload(payload) {
  return payload && payload.user ? payload.user : payload;
}

// ── Tab switching ────────────────────────────────────────────────────────────

function switchTab(tab) {
  const tabs = [
    { key: 'userInfo',        panelId: 'tabUserInfo',        navId: 'navUserInfo' },
    { key: 'addressBilling',  panelId: 'tabAddressBilling',  navId: 'navAddressBilling' },
  ];

  tabs.forEach(({ key, panelId, navId }) => {
    const panel = document.getElementById(panelId);
    const btn   = document.getElementById(navId);
    if (!panel || !btn) return;

    const isActive = key === tab;
    panel.classList.toggle('active', isActive);
    btn.classList.toggle('active', isActive);
  });
}

// ── Billing address toggle ───────────────────────────────────────────────────

function toggleBillingFields(sameAsShipping) {
  const billingFields = document.getElementById('billingFields');
  if (!billingFields) return;
  billingFields.style.display = sameAsShipping ? 'none' : '';
}

// ── Password visibility toggle ───────────────────────────────────────────────

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';

  // Swap Lucide icon
  const icon = btn.querySelector('i[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', isText ? 'eye' : 'eye-off');
    lucide.createIcons({ nodes: [icon] });
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

async function saveAvatar(dataUrl) {
  try {
    const response = await fetch(CURRENT_USER_API_URL, {
      method: 'PUT',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ avatarUrl: dataUrl }),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }
    if (!response.ok) {
      showPopup(data.message || 'Failed to update avatar');
      return;
    }

    const user = normalizeUserPayload(data);
    populateSidebar(user);
    syncProfileToStorage(user);
    showPopup('Avatar updated successfully');
  } catch {
    showPopup('Cannot connect to server.');
  }
}

function bindAvatarUpload() {
  const trigger = document.getElementById('accountAvatarTrigger');
  const input = document.getElementById('avatarFileInput');
  const removeBtn = document.getElementById('removeAvatarBtn');
  if (!trigger || !input) return;

  const openPicker = () => input.click();

  trigger.addEventListener('click', openPicker);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showPopup('Please choose an image file');
      return;
    }

    const maxBytes = MAX_AVATAR_FILE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      showPopup(`Avatar must be smaller than ${MAX_AVATAR_FILE_MB}MB`);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      await saveAvatar(dataUrl);
    } catch {
      showPopup('Cannot read selected image');
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', async () => {
      await saveAvatar('');
    });
  }
}

// ── Sidebar population ───────────────────────────────────────────────────────

function populateSidebar(user) {
  const nameEl     = document.getElementById('sidebarUsername');
  const providerEl = document.getElementById('sidebarProviderText');
  const avatarImg  = document.getElementById('accountAvatar');
  const avatarIcon = document.getElementById('accountAvatarIcon');

  if (nameEl)     nameEl.textContent = user.username || user.fullName || 'User';
  if (providerEl) {
    const provider = String(user.provider || 'local').toLowerCase();
    providerEl.textContent = provider === 'google' ? 'Google Account' : 'Local Account';
  }

  if (avatarImg) {
    const url = user.avatarUrl || '';
    if (url) {
      avatarImg.src = url;
      avatarImg.style.display = 'block';
      if (avatarIcon) avatarIcon.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      if (avatarIcon) avatarIcon.style.display = '';
    }
  }
}

// ── Profile form (Tab 1) population ─────────────────────────────────────────

function populateProfileForm(user) {
  const username = document.getElementById('username');
  const email    = document.getElementById('email');
  if (username) username.value = user.username || '';
  if (email)    email.value    = user.email    || '';
  // Password fields are always left empty for security
}

// ── Address form (Tab 2) population ─────────────────────────────────────────

function populateAddressForm(user) {
  const addr = user.address || {};
  const billing = user.billingAddress || {};
  const sameAs  = user.billingSameAsShipping !== false;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('street', addr.street);
  set('city',   addr.city);
  set('state',  addr.state);
  set('zip',    addr.zip);

  const checkbox = document.getElementById('billingSameAsShipping');
  if (checkbox) checkbox.checked = sameAs;
  toggleBillingFields(sameAs);

  set('billingStreet', billing.street);
  set('billingCity',   billing.city);
  set('billingState',  billing.state);
  set('billingZip',    billing.zip);
}

// ── Populate from cached localStorage profile ────────────────────────────────

function populateFromCachedProfile() {
  const cached = typeof getProfile === 'function' ? getProfile() : {};
  if (!cached || (!cached.username && !cached.email)) return false;
  populateProfileForm(cached);
  populateAddressForm(cached);
  populateSidebar(cached);
  return true;
}

// ── Sync API user to localStorage ────────────────────────────────────────────

function syncProfileToStorage(user) {
  if (typeof getProfile !== 'function' || typeof saveProfile !== 'function') return;
  const existing = getProfile();
  saveProfile({
    ...existing,
    userId:              user._id || user.id || existing.userId || localStorage.getItem('userId'),
    username:            user.username || '',
    email:               user.email || '',
    role:                user.role || existing.role || 'user',
    provider:            user.provider || existing.provider || 'local',
    googleId:            user.googleId || existing.googleId || '',
    fullName:            user.fullName || '',
    dateOfBirth:         user.dateOfBirth || null,
    address:             user.address || { street: '', city: '', state: '', zip: '' },
    billingSameAsShipping: user.billingSameAsShipping !== false,
    billingAddress:      user.billingAddress || { street: '', city: '', state: '', zip: '' },
    avatarUrl:           user.avatarUrl || existing.avatarUrl || '',
  });
}

// ── Load profile from API ────────────────────────────────────────────────────

async function loadUserProfile() {
  const hasCached = populateFromCachedProfile();

  try {
    const response = await fetch(CURRENT_USER_API_URL, { headers: buildAuthHeaders() });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup(hasCached
        ? 'Cannot refresh account info right now. Data shown may be outdated.'
        : 'Session expired. Please log in again.');
      if (!hasCached) logout();
      return;
    }

    if (!response.ok) {
      showPopup(data.message || 'Failed to load profile');
      return;
    }

    const user = normalizeUserPayload(data);
    populateProfileForm(user);
    populateAddressForm(user);
    populateSidebar(user);
    syncProfileToStorage(user);
    if (window.updateWelcomeMessage) window.updateWelcomeMessage();
  } catch {
    if (!hasCached) showPopup('Cannot connect to server.');
  }
}

// ── Save profile info (Tab 1: username + optional password) ──────────────────

async function saveProfileInfo(e) {
  e.preventDefault();

  const username      = (document.getElementById('username')?.value || '').trim();
  const currentPwd    = (document.getElementById('currentPassword')?.value || '');
  const newPwd        = (document.getElementById('newPassword')?.value || '');
  const confirmPwd    = (document.getElementById('confirmPassword')?.value || '');

  if (!username) { showPopup('Username is required'); return; }

  // Validate password fields only if user filled any of them
  const changingPassword = currentPwd || newPwd || confirmPwd;
  if (changingPassword) {
    if (!currentPwd || !newPwd || !confirmPwd) {
      showPopup('Fill all three password fields to change your password');
      return;
    }
    if (newPwd.length < 6) {
      showPopup('New password must be at least 6 characters');
      return;
    }
    if (newPwd !== confirmPwd) {
      showPopup('New passwords do not match');
      return;
    }
  }

  const body = { username };
  if (changingPassword) {
    body.currentPassword = currentPwd;
    body.newPassword     = newPwd;
  }

  try {
    const response = await fetch(CURRENT_USER_API_URL, {
      method: 'PUT',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }
    if (!response.ok) {
      showPopup(data.message || 'Failed to save changes');
      return;
    }

    const user = normalizeUserPayload(data);
    populateProfileForm(user);
    populateSidebar(user);
    syncProfileToStorage(user);

    // Clear password fields on success
    ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    showPopup('Changes saved successfully');
    if (window.updateWelcomeMessage) window.updateWelcomeMessage();
  } catch {
    showPopup('Cannot connect to server.');
  }
}

// ── Save address info (Tab 2: shipping + billing) ────────────────────────────

async function saveAddressInfo(e) {
  e.preventDefault();

  const sameAs = document.getElementById('billingSameAsShipping')?.checked !== false;

  const body = {
    address: {
      street: (document.getElementById('street')?.value  || '').trim(),
      city:   (document.getElementById('city')?.value    || '').trim(),
      state:  (document.getElementById('state')?.value   || '').trim(),
      zip:    (document.getElementById('zip')?.value     || '').trim(),
    },
    billingSameAsShipping: sameAs,
    billingAddress: sameAs ? null : {
      street: (document.getElementById('billingStreet')?.value || '').trim(),
      city:   (document.getElementById('billingCity')?.value   || '').trim(),
      state:  (document.getElementById('billingState')?.value  || '').trim(),
      zip:    (document.getElementById('billingZip')?.value    || '').trim(),
    },
  };

  try {
    const response = await fetch(CURRENT_USER_API_URL, {
      method: 'PUT',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }
    if (!response.ok) {
      showPopup(data.message || 'Failed to save address');
      return;
    }

    const user = normalizeUserPayload(data);
    populateAddressForm(user);
    syncProfileToStorage(user);
    showPopup('Address saved successfully');
  } catch {
    showPopup('Cannot connect to server.');
  }
}

// ── DOMContentLoaded entry point ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  window.isLoggedIn = (typeof getAuthState === 'function' ? getAuthState() : false)
                   || Boolean(typeof getAuthToken === 'function' ? getAuthToken() : localStorage.getItem('authToken'));

  if (!window.isLoggedIn) {
    window.location.href = 'index.html';
    return;
  }

  const profile = typeof getProfile === 'function' ? getProfile() : {};
  if ((profile.role || 'user').toLowerCase() === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  // Wire up logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout());
  bindAvatarUpload();

  // Wire up forms
  const profileForm = document.getElementById('profileForm');
  if (profileForm) profileForm.addEventListener('submit', saveProfileInfo);

  const addressForm = document.getElementById('addressForm');
  if (addressForm) addressForm.addEventListener('submit', saveAddressInfo);

  // Initialise billing fields state (hidden by default since checkbox starts checked)
  toggleBillingFields(true);

  // Load data
  await loadUserProfile();

  if (window.awaitCommerceStateReady) await window.awaitCommerceStateReady();
});


