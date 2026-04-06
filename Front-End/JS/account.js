// account.js - handle account profile page (sidebar layout)

const ACCOUNT_USER_API_BASE_URL = 'http://127.0.0.1:3001/api/users';
const CURRENT_USER_API_URL = `${ACCOUNT_USER_API_BASE_URL}/me`;
const ACCOUNT_ORDER_API_URL = 'http://127.0.0.1:3001/api/orders/me';
const MAX_AVATAR_FILE_MB = 2;
let ordersLoadedOnce = false;

// ── Auth helpers ────────────────────────────────────────────────────────────

function buildAuthHeaders(baseHeaders = {}) {
  const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('authToken') || '');
  if (!token) return baseHeaders;
  return { ...baseHeaders, Authorization: `Bearer ${token}` };
}

function normalizeUserPayload(payload) {
  return payload && payload.user ? payload.user : payload;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Tab switching ────────────────────────────────────────────────────────────

function switchTab(tab) {
  const tabs = [
    { key: 'userInfo',        panelId: 'tabUserInfo',        navId: 'navUserInfo' },
    { key: 'addressBilling',  panelId: 'tabAddressBilling',  navId: 'navAddressBilling' },
    { key: 'orders',          panelId: 'tabOrders',          navId: 'navOrders' },
    { key: 'security',        panelId: 'tabSecurity',        navId: 'navSecurity' },
  ];

  tabs.forEach(({ key, panelId, navId }) => {
    const panel = document.getElementById(panelId);
    const btn   = document.getElementById(navId);
    if (!panel || !btn) return;

    const isActive = key === tab;
    panel.classList.toggle('active', isActive);
    btn.classList.toggle('active', isActive);
  });

  // Load MFA status when switching to security tab
  if (tab === 'security') {
    loadMfaStatus();
  }

  if (tab === 'orders' && !ordersLoadedOnce) {
    loadOrderHistory();
  }
}

function formatOrderDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString('vi-VN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatOrderCurrency(amount, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function normalizeOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'paid' || value === 'completed' || value === 'success') return 'paid';
  if (value === 'failed' || value === 'cancelled') return 'failed';
  return 'pending';
}

function getOrderStatusLabel(status) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'paid') return 'Paid';
  if (normalized === 'failed') return 'Failed';
  return 'Pending';
}

function setOrdersUiState({ loading = false, error = '', empty = false }) {
  const loadingEl = document.getElementById('ordersLoading');
  const emptyEl = document.getElementById('ordersEmpty');
  const errorEl = document.getElementById('ordersError');

  if (loadingEl) loadingEl.style.display = loading ? '' : 'none';
  if (emptyEl) emptyEl.style.display = empty ? '' : 'none';
  if (errorEl) {
    errorEl.style.display = error ? '' : 'none';
    errorEl.textContent = error || '';
  }
}

function renderOrdersSummary(orders) {
  const summaryEl = document.getElementById('ordersSummary');
  if (!summaryEl) return;

  if (!Array.isArray(orders) || !orders.length) {
    summaryEl.style.display = 'none';
    summaryEl.textContent = '';
    return;
  }

  const totalSpend = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  summaryEl.style.display = '';
  summaryEl.textContent = `Total orders: ${orders.length} • Total spend: ${formatOrderCurrency(totalSpend)}`;
}

function renderOrderItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="order-items-empty">No item details.</p>';
  }

  return `
    <ul class="order-items-list">
      ${items.slice(0, 5).map(item => `
        <li>
          <span>${escapeHtml(item.name || 'Item')}</span>
          <strong>x${Number(item.quantity || 1)}</strong>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderOrderHistory(orders) {
  const listEl = document.getElementById('ordersList');
  if (!listEl) return;

  if (!Array.isArray(orders) || !orders.length) {
    listEl.innerHTML = '';
    renderOrdersSummary([]);
    setOrdersUiState({ empty: true });
    return;
  }

  listEl.innerHTML = orders.map(order => {
    const status = normalizeOrderStatus(order.status);
    const orderId = String(order.id || '').slice(-8).toUpperCase() || 'N/A';
    const sourceLabel = order.source === 'build' ? 'Build' : 'Cart';

    return `
      <article class="order-card">
        <div class="order-card-head">
          <div>
            <p class="order-id">#${escapeHtml(orderId)}</p>
            <p class="order-date">${escapeHtml(formatOrderDate(order.createdAt))}</p>
          </div>
          <span class="order-status ${status}">${getOrderStatusLabel(order.status)}</span>
        </div>

        <div class="order-meta-row">
          <span>Source: <strong>${escapeHtml(sourceLabel)}</strong></span>
          <span>Items: <strong>${Array.isArray(order.items) ? order.items.length : 0}</strong></span>
          <span>Total: <strong>${escapeHtml(formatOrderCurrency(order.totalAmount, order.currency || 'VND'))}</strong></span>
        </div>

        ${renderOrderItems(order.items)}
      </article>
    `;
  }).join('');

  renderOrdersSummary(orders);
  setOrdersUiState({});
}

async function loadOrderHistory() {
  setOrdersUiState({ loading: true });

  try {
    const response = await fetch(ACCOUNT_ORDER_API_URL, {
      headers: buildAuthHeaders(),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      setOrdersUiState({ error: data.message || 'Failed to load orders.' });
      return;
    }

    ordersLoadedOnce = true;
    renderOrderHistory(Array.isArray(data) ? data : []);
  } catch {
    setOrdersUiState({ error: 'Cannot connect to server.' });
  } finally {
    const loadingEl = document.getElementById('ordersLoading');
    if (loadingEl) loadingEl.style.display = 'none';
  }
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

// ── MFA Functions (Tab 3: Security) ─────────────────────────────────────────

async function loadMfaStatus() {
  try {
    const response = await fetch(`${ACCOUNT_USER_API_BASE_URL}/mfa/status`, {
      headers: buildAuthHeaders(),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      showPopup('Failed to load MFA status');
      return;
    }

    const mfaEnabled = data.enabled || false;
    const emailMfaEnabled = data.emailMfaEnabled || false;
    updateMfaUI(mfaEnabled);
    updateEmailMfaUI(emailMfaEnabled);
  } catch {
    showPopup('Cannot connect to server.');
  }
}

function updateMfaUI(enabled) {
  const statusText = document.getElementById('mfaStatusText');
  const enableSection = document.getElementById('mfaEnableSection');
  const disableSection = document.getElementById('mfaDisableSection');
  const actionContainer = document.getElementById('mfaActionContainer');

  if (!statusText) return;

  if (enabled) {
    statusText.innerHTML = '<i data-lucide="check-circle" style="width:16px;height:16px;color:#28a745;vertical-align:-2px;margin-right:4px;"></i> Enabled';
    if (enableSection) enableSection.style.display = 'none';
    if (disableSection) disableSection.style.display = '';
    if (actionContainer) actionContainer.innerHTML = '';
  } else {
    statusText.innerHTML = '<i data-lucide="alert-circle" style="width:16px;height:16px;color:#ffc107;vertical-align:-2px;margin-right:4px;"></i> Disabled';
    if (enableSection) enableSection.style.display = '';
    if (disableSection) disableSection.style.display = 'none';
    if (actionContainer) actionContainer.innerHTML = '<button type="button" class="btn btn-sm btn-outline-primary" onclick="startMfaSetup()">Enable 2FA</button>';
  }

  lucide.createIcons();
}

async function startMfaSetup() {
  try {
    const response = await fetch(`${ACCOUNT_USER_API_BASE_URL}/mfa/setup`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      showPopup(data.message || 'Failed to start MFA setup');
      return;
    }

    // Display QR code
    const qrCodeDisplay = document.getElementById('qrCodeDisplay');
    const setupKey = document.getElementById('setupKey');

    if (qrCodeDisplay) {
      qrCodeDisplay.innerHTML = '';
      if (window.QRCode) {
        new window.QRCode(qrCodeDisplay, {
          text: data.otpauthUrl,
          width: 200,
          height: 200,
          colorDark: '#000000',
          colorLight: '#ffffff'
        });
      } else {
        qrCodeDisplay.innerHTML = '<p class="text-danger">QR Code library not loaded</p>';
      }
    }

    if (setupKey) {
      setupKey.textContent = data.manualEntryKey || '';
    }

    showPopup('Scan the QR code with your Google Authenticator app');
  } catch {
    showPopup('Cannot connect to server.');
  }
}

async function verifyMfaSetup(e) {
  e.preventDefault();

  const code = (document.getElementById('mfaVerifyCode')?.value || '').trim();
  if (!code || code.length !== 6) {
    showPopup('Please enter a valid 6-digit code');
    return;
  }

  try {
    const response = await fetch(`${ACCOUNT_USER_API_BASE_URL}/mfa/verify-setup`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ token: code }),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      showPopup(data.message || 'Invalid code');
      return;
    }

    showPopup('Two-Factor Authentication enabled successfully!');
    document.getElementById('mfaVerifyCode').value = '';
    updateMfaUI(true);
  } catch {
    showPopup('Cannot connect to server.');
  }
}

async function disableMfa(e) {
  e.preventDefault();

  const code = (document.getElementById('mfaDisableCode')?.value || '').trim();
  if (!code || code.length !== 6) {
    showPopup('Please enter a valid 6-digit code');
    return;
  }

  try {
    const response = await fetch(`${ACCOUNT_USER_API_BASE_URL}/mfa/disable`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ token: code }),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      showPopup(data.message || 'Invalid code');
      return;
    }

    showPopup('Two-Factor Authentication disabled successfully!');
    document.getElementById('mfaDisableCode').value = '';
    updateMfaUI(false);
  } catch {
    showPopup('Cannot connect to server.');
  }
}

// ── Email MFA Functions ───────────────────────────────────────────────────────

function updateEmailMfaUI(enabled) {
  const statusText = document.getElementById('emailMfaStatusText');
  const enableSection = document.getElementById('emailMfaEnableSection');
  const disableSection = document.getElementById('emailMfaDisableSection');
  const actionContainer = document.getElementById('emailMfaActionContainer');

  if (!statusText) return;

  // Populate the user email hint
  const profile = typeof getProfile === 'function' ? getProfile() : {};
  const emailEl = document.getElementById('emailMfaUserEmail');
  if (emailEl) emailEl.textContent = profile.email || 'your email';

  if (enabled) {
    statusText.innerHTML = '<i data-lucide="check-circle" style="width:16px;height:16px;color:#28a745;vertical-align:-2px;margin-right:4px;"></i> Enabled';
    if (enableSection) enableSection.style.display = 'none';
    if (disableSection) disableSection.style.display = '';
    if (actionContainer) actionContainer.innerHTML = '';
  } else {
    statusText.innerHTML = '<i data-lucide="alert-circle" style="width:16px;height:16px;color:#ffc107;vertical-align:-2px;margin-right:4px;"></i> Disabled';
    if (enableSection) enableSection.style.display = '';
    if (disableSection) disableSection.style.display = 'none';
    if (actionContainer) actionContainer.innerHTML = '';
    // Reset form visibility
    const verifyForm = document.getElementById('emailMfaVerifyForm');
    if (verifyForm) verifyForm.style.display = 'none';
  }

  lucide.createIcons();
}

async function requestEmailMfaCode(action) {
  try {
    const response = await fetch(`${ACCOUNT_USER_API_BASE_URL}/mfa/email/send-code`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      showPopup(data.message || 'Failed to send code');
      return;
    }

    showPopup(data.message || 'Verification code sent!');

    if (action === 'enable') {
      const verifyForm = document.getElementById('emailMfaVerifyForm');
      if (verifyForm) verifyForm.style.display = '';
    } else {
      const disableForm = document.getElementById('emailMfaDisableForm');
      if (disableForm) disableForm.style.display = '';
    }
  } catch {
    showPopup('Cannot connect to server.');
  }
}

async function submitEmailMfaEnable(e) {
  e.preventDefault();

  const code = (document.getElementById('emailMfaVerifyCode')?.value || '').trim();
  if (!code || code.length !== 6) {
    showPopup('Please enter a valid 6-digit code');
    return;
  }

  try {
    const response = await fetch(`${ACCOUNT_USER_API_BASE_URL}/mfa/email/enable`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ token: code }),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      showPopup(data.message || 'Invalid code');
      return;
    }

    showPopup('Email Verification enabled successfully!');
    document.getElementById('emailMfaVerifyCode').value = '';
    updateEmailMfaUI(true);
  } catch {
    showPopup('Cannot connect to server.');
  }
}

async function submitEmailMfaDisable(e) {
  e.preventDefault();

  const code = (document.getElementById('emailMfaDisableCode')?.value || '').trim();
  if (!code || code.length !== 6) {
    showPopup('Please enter a valid 6-digit code');
    return;
  }

  try {
    const response = await fetch(`${ACCOUNT_USER_API_BASE_URL}/mfa/email/disable`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ token: code }),
    });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      showPopup('Session expired. Please log in again.');
      logout();
      return;
    }

    if (!response.ok) {
      showPopup(data.message || 'Invalid code');
      return;
    }

    showPopup('Email Verification disabled successfully!');
    document.getElementById('emailMfaDisableCode').value = '';
    updateEmailMfaUI(false);
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

  const mfaVerifyForm = document.getElementById('mfaVerifyForm');
  if (mfaVerifyForm) mfaVerifyForm.addEventListener('submit', verifyMfaSetup);

  const mfaDisableForm = document.getElementById('mfaDisableForm');
  if (mfaDisableForm) mfaDisableForm.addEventListener('submit', disableMfa);

  const emailMfaVerifyForm = document.getElementById('emailMfaVerifyForm');
  if (emailMfaVerifyForm) emailMfaVerifyForm.addEventListener('submit', submitEmailMfaEnable);

  const emailMfaDisableForm = document.getElementById('emailMfaDisableForm');
  if (emailMfaDisableForm) emailMfaDisableForm.addEventListener('submit', submitEmailMfaDisable);

  // Initialise billing fields state (hidden by default since checkbox starts checked)
  toggleBillingFields(true);

  // Load data
  await loadUserProfile();

  if (window.awaitCommerceStateReady) await window.awaitCommerceStateReady();
});


