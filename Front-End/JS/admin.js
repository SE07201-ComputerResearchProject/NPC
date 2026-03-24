const API_BASE = 'http://localhost:3000/api';
const USER_API_BASE = `${API_BASE}/users`;
const PRODUCT_API_BASE = `${API_BASE}/components`;
const LOG_API_BASE = `${API_BASE}/logs`;
const FEATURED_BUILD_API_BASE = `${API_BASE}/featured-builds`;

const PRODUCT_CATEGORIES = [
  'case',
  'cpu',
  'motherboard',
  'gpu',
  'ram',
  'storage',
  'psu',
  'cooler',
  'fan',
];

const PRODUCT_VIEW_MORE_IMAGE_SLOTS = 3;

const state = {
  users: [],
  products: [],
  logs: [],
  featuredBuilds: [],
  editingUserId: null,
  editingProductId: null,
  editingProductImageUrls: [],
  pendingProductImageUrls: [],
  editingFeaturedBuildId: null,
  logAutoRefreshTimer: null,
};

const ADMIN_MODULES = {
  usersSection: {
    label: 'CRUD User',
    description: 'Manage accounts, profile details, and role visibility from one place.',
    stageCopy: 'Create, update, search, and inspect user records inside the main dashboard area.',
  },
  productsSection: {
    label: 'CRUD Product',
    description: 'Update component catalog data including category, stock, pricing, and gallery images.',
    stageCopy: 'Run product CRUD operations with filters for category and keyword-driven search.',
  },
  prebuiltSection: {
    label: 'CRUD Pre-Built',
    description: 'Control preset PCs, tier tags, display order, and structured parts payloads.',
    stageCopy: 'Compose and maintain featured build presets through a single editing surface.',
  },
  logsSection: {
    label: 'View Logs',
    description: 'Review recent events, isolate suspicious activity, and auto-refresh the stream.',
    stageCopy: 'Monitor the latest log entries with quick filters and activity severity markers.',
  },
};

const el = {
  adminUserId: document.getElementById('adminUserId'),
  saveAdminIdBtn: document.getElementById('saveAdminIdBtn'),
  globalStatus: document.getElementById('globalStatus'),
  adminAccessPanel: document.getElementById('adminAccessPanel'),
  adminWorkspace: document.getElementById('adminWorkspace'),
  adminUnauthorized: document.getElementById('adminUnauthorized'),
  adminNavButtons: Array.from(document.querySelectorAll('[data-admin-target]')),
  activeModuleName: document.getElementById('activeModuleName'),
  activeModuleDescription: document.getElementById('activeModuleDescription'),
  activeModuleBadge: document.getElementById('activeModuleBadge'),
  activeModuleConsoleCopy: document.getElementById('activeModuleConsoleCopy'),
  stageModuleTitle: document.getElementById('stageModuleTitle'),
  stageModuleDescription: document.getElementById('stageModuleDescription'),
  usersCount: document.getElementById('usersCount'),
  productsCount: document.getElementById('productsCount'),
  prebuiltCount: document.getElementById('prebuiltCount'),
  logsCount: document.getElementById('logsCount'),

  userForm: document.getElementById('userForm'),
  userId: document.getElementById('userId'),
  userUsername: document.getElementById('userUsername'),
  userEmail: document.getElementById('userEmail'),
  userPassword: document.getElementById('userPassword'),
  userFullName: document.getElementById('userFullName'),
  userDob: document.getElementById('userDob'),
  userStreet: document.getElementById('userStreet'),
  userCity: document.getElementById('userCity'),
  userState: document.getElementById('userState'),
  userZip: document.getElementById('userZip'),
  userSubmitBtn: document.getElementById('userSubmitBtn'),
  userResetBtn: document.getElementById('userResetBtn'),
  userSearch: document.getElementById('userSearch'),
  reloadUsersBtn: document.getElementById('reloadUsersBtn'),
  usersTableBody: document.querySelector('#usersTable tbody'),
  userStatus: document.getElementById('userStatus'),
  passwordFieldWrap: document.getElementById('passwordFieldWrap'),

  productForm: document.getElementById('productForm'),
  productId: document.getElementById('productId'),
  productCategory: document.getElementById('productCategory'),
  productName: document.getElementById('productName'),
  productBrand: document.getElementById('productBrand'),
  productPrice: document.getElementById('productPrice'),
  productPower: document.getElementById('productPower'),
  productStock: document.getElementById('productStock'),
  productImageFile: document.getElementById('productImageFile'),
  productImageHint: document.getElementById('productImageHint'),
  productHighlights: document.getElementById('productHighlights'),
  productDescription: document.getElementById('productDescription'),
  productSubmitBtn: document.getElementById('productSubmitBtn'),
  productResetBtn: document.getElementById('productResetBtn'),
  productCategoryFilter: document.getElementById('productCategoryFilter'),
  productSearch: document.getElementById('productSearch'),
  reloadProductsBtn: document.getElementById('reloadProductsBtn'),
  productsTableBody: document.querySelector('#productsTable tbody'),
  productStatus: document.getElementById('productStatus'),

  reloadLogsBtn: document.getElementById('reloadLogsBtn'),
  clearAllLogsBtn: document.getElementById('clearAllLogsBtn'),
  logSearch: document.getElementById('logSearch'),
  logLimit: document.getElementById('logLimit'),
  logSuspiciousOnly: document.getElementById('logSuspiciousOnly'),
  logAutoRefresh: document.getElementById('logAutoRefresh'),
  logsTableBody: document.querySelector('#logsTable tbody'),
  logStatus: document.getElementById('logStatus'),

  prebuiltForm: document.getElementById('prebuiltForm'),
  prebuiltId: document.getElementById('prebuiltId'),
  prebuiltPresetId: document.getElementById('prebuiltPresetId'),
  prebuiltName: document.getElementById('prebuiltName'),
  prebuiltTagline: document.getElementById('prebuiltTagline'),
  prebuiltTier: document.getElementById('prebuiltTier'),
  prebuiltEstimatedPrice: document.getElementById('prebuiltEstimatedPrice'),
  prebuiltOrder: document.getElementById('prebuiltOrder'),
  prebuiltPartsJson: document.getElementById('prebuiltPartsJson'),
  prebuiltSubmitBtn: document.getElementById('prebuiltSubmitBtn'),
  prebuiltResetBtn: document.getElementById('prebuiltResetBtn'),
  prebuiltSearch: document.getElementById('prebuiltSearch'),
  reloadPrebuiltBtn: document.getElementById('reloadPrebuiltBtn'),
  prebuiltTableBody: document.querySelector('#prebuiltTable tbody'),
  prebuiltStatus: document.getElementById('prebuiltStatus'),
};

function updateConsoleSurface(targetId) {
  const moduleMeta = ADMIN_MODULES[targetId] || ADMIN_MODULES.usersSection;

  if (el.activeModuleName) {
    el.activeModuleName.textContent = moduleMeta.label;
  }
  if (el.activeModuleDescription) {
    el.activeModuleDescription.textContent = moduleMeta.description;
  }
  if (el.activeModuleBadge) {
    el.activeModuleBadge.textContent = moduleMeta.label;
  }
  if (el.activeModuleConsoleCopy) {
    el.activeModuleConsoleCopy.textContent = moduleMeta.description;
  }
  if (el.stageModuleTitle) {
    el.stageModuleTitle.textContent = moduleMeta.label;
  }
  if (el.stageModuleDescription) {
    el.stageModuleDescription.textContent = moduleMeta.stageCopy;
  }
}

function updateConsoleMetrics() {
  if (el.usersCount) {
    el.usersCount.textContent = String(state.users.length);
  }
  if (el.productsCount) {
    el.productsCount.textContent = String(state.products.length);
  }
  if (el.prebuiltCount) {
    el.prebuiltCount.textContent = String(state.featuredBuilds.length);
  }
  if (el.logsCount) {
    el.logsCount.textContent = String(state.logs.length);
  }
}

function switchAdminSection(targetId) {
  const moduleIds = ['usersSection', 'productsSection', 'prebuiltSection', 'logsSection'];
  moduleIds.forEach(id => {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.toggle('is-active', id === targetId);
  });

  el.adminNavButtons.forEach(button => {
    const isActive = button.dataset.adminTarget === targetId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  updateConsoleSurface(targetId);
}

function setStatus(target, message, type = 'info') {
  if (!target) return;
  target.textContent = message;
  target.classList.remove('ok', 'error', 'info');
  target.classList.add(type);
}

function toErrorMessage(error, fallback) {
  if (!error) return fallback;
  return error.message || fallback;
}

function isMissingRouteError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('404') || message.includes('not found');
}

function getProfileSafe() {
  if (typeof getProfile === 'function') {
    return getProfile() || {};
  }

  try {
    return JSON.parse(localStorage.getItem('profile') || '{}');
  } catch {
    return {};
  }
}

function getAuthStateSafe() {
  if (typeof getAuthState === 'function') {
    return getAuthState();
  }
  return localStorage.getItem('isLoggedIn') === 'true';
}

function setWorkspaceAccess(isAllowed) {
  if (el.adminAccessPanel) {
    el.adminAccessPanel.classList.toggle('d-none', !isAllowed);
  }
  if (el.adminWorkspace) {
    el.adminWorkspace.classList.toggle('d-none', !isAllowed);
  }
  if (el.adminUnauthorized) {
    el.adminUnauthorized.classList.toggle('d-none', isAllowed);
  }
}

function escapeHtml(value) {
  const text = String(value ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateForInput(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

function isSuspiciousLog(log) {
  const content = `${log?.activity || ''} ${log?.user || ''}`.toLowerCase();
  return /(error|fail|invalid|unauthorized|denied|exception|forbidden)/i.test(content);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

function updateProductImageHint(message) {
  if (!el.productImageHint) return;
  el.productImageHint.textContent = message;
}

function normalizeProductImageUrls(product) {
  const fromArray = Array.isArray(product?.imageUrls)
    ? product.imageUrls.map(item => String(item || '').trim()).filter(Boolean)
    : [];

  if (fromArray.length > 0) {
    return fromArray.slice(0, PRODUCT_VIEW_MORE_IMAGE_SLOTS);
  }

  const single = String(product?.imageUrl || '').trim();
  return single ? [single] : [];
}

async function handleProductImageFileChange() {
  const files = Array.from(el.productImageFile?.files || []);
  if (!files.length) {
    state.pendingProductImageUrls = [];
    if (state.editingProductImageUrls.length) {
      updateProductImageHint(`Current images: ${state.editingProductImageUrls.length} file(s).`);
    } else {
      updateProductImageHint('No file selected. You can choose up to 3 images for View More.');
    }
    return;
  }

  const selectedFiles = files.slice(0, PRODUCT_VIEW_MORE_IMAGE_SLOTS);

  try {
    state.pendingProductImageUrls = await Promise.all(selectedFiles.map(file => fileToDataUrl(file)));
    const droppedCount = files.length - selectedFiles.length;
    if (droppedCount > 0) {
      updateProductImageHint(`Selected ${selectedFiles.length} image(s). Ignored ${droppedCount} extra file(s).`);
    } else {
      updateProductImageHint(`Selected ${selectedFiles.length} image(s).`);
    }
  } catch (error) {
    state.pendingProductImageUrls = [];
    if (el.productImageFile) {
      el.productImageFile.value = '';
    }
    if (state.editingProductImageUrls.length) {
      updateProductImageHint(`Current images: ${state.editingProductImageUrls.length} file(s).`);
    } else {
      updateProductImageHint('No file selected. You can choose up to 3 images for View More.');
    }
    setStatus(el.productStatus, toErrorMessage(error, 'Failed to read image file.'), 'error');
  }
}

async function requestJson(url, options = {}) {
  const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('authToken') || '');
  if (token) {
    options.headers = options.headers || {};
    if (!options.headers['Authorization'] && !options.headers['authorization']) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed: ${response.status}`);
  }

  return payload;
}

function getAdminUserId() {
  return (el.adminUserId.value || '').trim();
}

function ensureAdminUserId() {
  const id = getAdminUserId();
  if (!id) {
    setStatus(el.globalStatus, 'Please enter Admin User ID before managing products.', 'error');
    return null;
  }
  return id;
}

function saveAdminUserId() {
  const id = getAdminUserId();
  if (!id) {
    setStatus(el.globalStatus, 'Admin User ID cannot be empty.', 'error');
    return;
  }
  localStorage.setItem('adminUserId', id);
  setStatus(el.globalStatus, 'Admin User ID saved in browser storage.', 'ok');
}

function initCategoryOptions() {
  el.productCategory.innerHTML = PRODUCT_CATEGORIES
    .map(category => `<option value="${category}">${category.toUpperCase()}</option>`)
    .join('');

  const filterOptions = ['<option value="all">All categories</option>'];
  PRODUCT_CATEGORIES.forEach(category => {
    filterOptions.push(`<option value="${category}">${category.toUpperCase()}</option>`);
  });
  el.productCategoryFilter.innerHTML = filterOptions.join('');
}

function readUserForm() {
  return {
    username: el.userUsername.value.trim(),
    email: el.userEmail.value.trim(),
    password: el.userPassword.value,
    fullName: el.userFullName.value.trim(),
    dateOfBirth: el.userDob.value || null,
    address: {
      street: el.userStreet.value.trim(),
      city: el.userCity.value.trim(),
      state: el.userState.value.trim(),
      zip: el.userZip.value.trim(),
    },
  };
}

function setUserFormMode(editing) {
  state.editingUserId = editing ? el.userId.value : null;
  el.userSubmitBtn.textContent = editing ? 'Update User' : 'Create User';
  el.userEmail.disabled = editing;
  el.passwordFieldWrap.style.display = editing ? 'none' : 'block';

  if (!editing) {
    el.userPassword.required = true;
    el.userPassword.value = '';
  } else {
    el.userPassword.required = false;
  }
}

function clearUserForm() {
  el.userForm.reset();
  el.userId.value = '';
  setUserFormMode(false);
}

function fillUserForm(user) {
  el.userId.value = user._id || '';
  el.userUsername.value = user.username || '';
  el.userEmail.value = user.email || '';
  el.userFullName.value = user.fullName || '';
  el.userDob.value = formatDateForInput(user.dateOfBirth);
  el.userStreet.value = user.address?.street || '';
  el.userCity.value = user.address?.city || '';
  el.userState.value = user.address?.state || '';
  el.userZip.value = user.address?.zip || '';
  setUserFormMode(true);
}

function renderUsersTable(usersToRender) {
  if (!usersToRender.length) {
    el.usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No users found.</td></tr>';
    return;
  }

  el.usersTableBody.innerHTML = usersToRender
    .map(user => {
      const id = escapeHtml(user._id || '');
      return `
        <tr>
          <td>${escapeHtml(user.username)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.role || 'user')}</td>
          <td>${escapeHtml(user.fullName || '-')}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-sm btn-outline-primary" data-action="edit-user" data-id="${id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete-user" data-id="${id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function filterUsers() {
  const keyword = (el.userSearch.value || '').toLowerCase().trim();
  if (!keyword) {
    renderUsersTable(state.users);
    return;
  }

  const filtered = state.users.filter(user => {
    return [user.username, user.email, user.fullName]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword));
  });

  renderUsersTable(filtered);
}

async function loadUsers() {
  setStatus(el.userStatus, 'Loading users...', 'info');
  try {
    const users = await requestJson(USER_API_BASE);
    state.users = Array.isArray(users) ? users : [];
    filterUsers();
    updateConsoleMetrics();
    setStatus(el.userStatus, `Loaded ${state.users.length} users.`, 'ok');
  } catch (error) {
    setStatus(el.userStatus, toErrorMessage(error, 'Failed to load users.'), 'error');
  }
}

async function submitUserForm(event) {
  event.preventDefault();

  const form = readUserForm();
  if (!form.username) {
    setStatus(el.userStatus, 'Username is required.', 'error');
    return;
  }

  if (!state.editingUserId) {
    if (!form.email || !form.password) {
      setStatus(el.userStatus, 'Email and password are required when creating a user.', 'error');
      return;
    }

    setStatus(el.userStatus, 'Creating user...', 'info');
    try {
      await requestJson(`${USER_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      clearUserForm();
      await loadUsers();
      setStatus(el.userStatus, 'User created successfully.', 'ok');
    } catch (error) {
      setStatus(el.userStatus, toErrorMessage(error, 'Failed to create user.'), 'error');
    }
    return;
  }

  const updatePayload = {
    username: form.username,
    fullName: form.fullName,
    dateOfBirth: form.dateOfBirth,
    address: form.address,
  };

  setStatus(el.userStatus, 'Updating user...', 'info');
  try {
    await requestJson(`${USER_API_BASE}/${state.editingUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });
    clearUserForm();
    await loadUsers();
    setStatus(el.userStatus, 'User updated successfully.', 'ok');
  } catch (error) {
    setStatus(el.userStatus, toErrorMessage(error, 'Failed to update user.'), 'error');
  }
}

function handleUserTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  if (!id || !action) return;

  const user = state.users.find(item => item._id === id);
  if (!user) {
    setStatus(el.userStatus, 'Selected user was not found.', 'error');
    return;
  }

  if (action === 'edit-user') {
    fillUserForm(user);
    setStatus(el.userStatus, `Editing user: ${user.username}`, 'info');
    return;
  }

  if (action === 'delete-user') {
    const ok = window.confirm(`Delete user ${user.username}?`);
    if (!ok) return;

    setStatus(el.userStatus, 'Deleting user...', 'info');
    requestJson(`${USER_API_BASE}/${id}`, {
      method: 'DELETE',
    })
      .then(async () => {
        if (state.editingUserId === id) {
          clearUserForm();
        }
        await loadUsers();
        setStatus(el.userStatus, 'User deleted successfully.', 'ok');
      })
      .catch(error => {
        setStatus(el.userStatus, toErrorMessage(error, 'Failed to delete user.'), 'error');
      });
  }
}

function readProductForm() {
  const highlights = el.productHighlights.value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  const imageUrls = (state.pendingProductImageUrls.length
    ? state.pendingProductImageUrls
    : state.editingProductImageUrls).slice(0, PRODUCT_VIEW_MORE_IMAGE_SLOTS);
  const imageUrl = imageUrls[0] || '';

  return {
    category: el.productCategory.value,
    name: el.productName.value.trim(),
    brand: el.productBrand.value.trim(),
    price: Number(el.productPrice.value),
    power: Number(el.productPower.value || 0),
    stock: Number(el.productStock.value || 0),
    imageUrls,
    imageUrl,
    description: el.productDescription.value.trim(),
    highlights,
  };
}

function setProductFormMode(editing) {
  state.editingProductId = editing ? el.productId.value : null;
  el.productSubmitBtn.textContent = editing ? 'Update Product' : 'Create Product';
}

function clearProductForm() {
  el.productForm.reset();
  el.productId.value = '';
  state.pendingProductImageUrls = [];
  state.editingProductImageUrls = [];
  updateProductImageHint('No file selected. You can choose up to 3 images for View More.');
  setProductFormMode(false);
  if (PRODUCT_CATEGORIES.length > 0) {
    el.productCategory.value = PRODUCT_CATEGORIES[0];
  }
}

function fillProductForm(product) {
  el.productId.value = product._id || '';
  el.productCategory.value = product.category || PRODUCT_CATEGORIES[0];
  el.productName.value = product.name || '';
  el.productBrand.value = product.brand || '';
  el.productPrice.value = product.price ?? 0;
  el.productPower.value = product.power ?? 0;
  el.productStock.value = product.stock ?? 0;
  state.editingProductImageUrls = normalizeProductImageUrls(product);
  state.pendingProductImageUrls = [];
  if (el.productImageFile) {
    el.productImageFile.value = '';
  }
  if (state.editingProductImageUrls.length) {
    updateProductImageHint(`Current images: ${state.editingProductImageUrls.length} file(s).`);
  } else {
    updateProductImageHint('No file selected. You can choose up to 3 images for View More.');
  }
  el.productDescription.value = product.description || '';
  el.productHighlights.value = Array.isArray(product.highlights) ? product.highlights.join(', ') : '';
  setProductFormMode(true);
}

function renderProductsTable(products) {
  if (!products.length) {
    el.productsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No products found.</td></tr>';
    return;
  }

  el.productsTableBody.innerHTML = products
    .map(product => {
      const id = escapeHtml(product._id || '');
      return `
        <tr>
          <td>${escapeHtml(product.category)}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.brand || '-')}</td>
          <td>${Number(product.price || 0).toLocaleString()} VND</td>
          <td>${Number(product.stock || 0)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-sm btn-outline-primary" data-action="edit-product" data-id="${id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete-product" data-id="${id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function getFilteredLogs() {
  const keyword = (el.logSearch?.value || '').toLowerCase().trim();
  const suspiciousOnly = Boolean(el.logSuspiciousOnly?.checked);

  return state.logs.filter(log => {
    const haystack = `${log?.user || ''} ${log?.activity || ''}`.toLowerCase();
    const keywordMatch = !keyword || haystack.includes(keyword);
    const suspiciousMatch = !suspiciousOnly || isSuspiciousLog(log);
    return keywordMatch && suspiciousMatch;
  });
}

function renderLogsTable(logs) {
  if (!el.logsTableBody) return;

  if (!logs.length) {
    el.logsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No logs found.</td></tr>';
    return;
  }

  el.logsTableBody.innerHTML = logs
    .map(log => {
      const activity = escapeHtml(log?.activity || '-');
      const user = escapeHtml(log?.user || '-');
      const timestamp = escapeHtml(formatDateTime(log?.timeStamp));
      const suspicious = isSuspiciousLog(log);
      const badgeClass = suspicious ? 'alert' : 'normal';
      const badgeText = suspicious ? 'Alert' : 'Normal';
      const id = escapeHtml(log?._id || '');

      return `
        <tr>
          <td>${timestamp}</td>
          <td>${user}</td>
          <td class="log-activity" title="${activity}">${activity}</td>
          <td><span class="log-badge ${badgeClass}">${badgeText}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-danger" data-action="delete-log" data-id="${id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function refreshLogsView() {
  const filtered = getFilteredLogs();
  renderLogsTable(filtered);
  setStatus(el.logStatus, `Showing ${filtered.length}/${state.logs.length} logs.`, 'ok');
}

async function loadLogs() {
  if (!el.logStatus) return;

  setStatus(el.logStatus, 'Loading logs...', 'info');
  try {
    const limit = Math.max(1, Number(el.logLimit?.value || 50));
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('page', '1');
    params.set('sort', '-timeStamp');

    const payload = await requestJson(`${LOG_API_BASE}?${params.toString()}`);
    const logs = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);

    state.logs = logs;
    updateConsoleMetrics();
    refreshLogsView();
  } catch (error) {
    if (isMissingRouteError(error)) {
      clearLogAutoRefresh();
      if (el.logAutoRefresh) {
        el.logAutoRefresh.checked = false;
      }

      setStatus(el.logStatus, 'Log API route is not available yet. Front-end log box is ready.', 'info');
      if (el.logsTableBody) {
        el.logsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Waiting for Back-End log route.</td></tr>';
      }
      return;
    }

    setStatus(el.logStatus, toErrorMessage(error, 'Failed to load logs.'), 'error');
    if (el.logsTableBody) {
      el.logsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Cannot load logs.</td></tr>';
    }
  }
}

function handleLogTableClick(event) {
  const button = event.target.closest('button[data-action="delete-log"]');
  if (!button) return;
  const id = button.dataset.id;
  if (!id) return;
  const ok = window.confirm('Delete this log entry?');
  if (!ok) return;
  setStatus(el.logStatus, 'Deleting log...', 'info');
  requestJson(`${LOG_API_BASE}/${id}`, { method: 'DELETE' })
    .then(() => loadLogs())
    .catch(error => setStatus(el.logStatus, toErrorMessage(error, 'Failed to delete log.'), 'error'));
}

async function clearAllLogs() {
  const ok = window.confirm('Delete ALL logs? This cannot be undone.');
  if (!ok) return;
  setStatus(el.logStatus, 'Clearing all logs...', 'info');
  try {
    const result = await requestJson(`${LOG_API_BASE}`, { method: 'DELETE' });
    setStatus(el.logStatus, `Cleared ${result.deleted ?? 0} log(s).`, 'ok');
    state.logs = [];
    updateConsoleMetrics();
    refreshLogsView();
  } catch (error) {
    setStatus(el.logStatus, toErrorMessage(error, 'Failed to clear logs.'), 'error');
  }
}

function clearLogAutoRefresh() {
  if (state.logAutoRefreshTimer) {
    clearInterval(state.logAutoRefreshTimer);
    state.logAutoRefreshTimer = null;
  }
}

function toggleLogAutoRefresh() {
  clearLogAutoRefresh();

  if (!el.logAutoRefresh?.checked) {
    setStatus(el.logStatus, 'Auto refresh is off.', 'info');
    return;
  }

  state.logAutoRefreshTimer = setInterval(() => {
    loadLogs();
  }, 10000);

  setStatus(el.logStatus, 'Auto refresh enabled (10s).', 'info');
}

async function loadProducts() {
  setStatus(el.productStatus, 'Loading products...', 'info');
  try {
    const params = new URLSearchParams();
    const categoryFilter = el.productCategoryFilter.value;
    const search = (el.productSearch.value || '').trim();

    if (categoryFilter && categoryFilter !== 'all') {
      params.set('category', categoryFilter);
    }
    if (search) {
      params.set('q', search);
    }

    const qs = params.toString();
    const url = `${PRODUCT_API_BASE}${qs ? `?${qs}` : ''}`;
    const products = await requestJson(url);

    state.products = Array.isArray(products) ? products : [];
    updateConsoleMetrics();
    renderProductsTable(state.products);
    setStatus(el.productStatus, `Loaded ${state.products.length} products.`, 'ok');
  } catch (error) {
    setStatus(el.productStatus, toErrorMessage(error, 'Failed to load products.'), 'error');
  }
}

async function submitProductForm(event) {
  event.preventDefault();

  const payload = readProductForm();
  if (!payload.category || !payload.name || Number.isNaN(payload.price)) {
    setStatus(el.productStatus, 'Category, Name, and Price are required.', 'error');
    return;
  }

  const headers = { 'Content-Type': 'application/json' };

  if (!state.editingProductId) {
    setStatus(el.productStatus, 'Creating product...', 'info');
    try {
      await requestJson(PRODUCT_API_BASE, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      clearProductForm();
      await loadProducts();
      setStatus(el.productStatus, 'Product created successfully.', 'ok');
    } catch (error) {
      setStatus(el.productStatus, toErrorMessage(error, 'Failed to create product.'), 'error');
    }
    return;
  }

  setStatus(el.productStatus, 'Updating product...', 'info');
  try {
    await requestJson(`${PRODUCT_API_BASE}/${state.editingProductId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    clearProductForm();
    await loadProducts();
    setStatus(el.productStatus, 'Product updated successfully.', 'ok');
  } catch (error) {
    setStatus(el.productStatus, toErrorMessage(error, 'Failed to update product.'), 'error');
  }
}

function handleProductTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  if (!id || !action) return;

  const product = state.products.find(item => item._id === id);
  if (!product) {
    setStatus(el.productStatus, 'Selected product was not found.', 'error');
    return;
  }

  if (action === 'edit-product') {
    fillProductForm(product);
    setStatus(el.productStatus, `Editing product: ${product.name}`, 'info');
    return;
  }

  if (action === 'delete-product') {
    const ok = window.confirm(`Delete product ${product.name}?`);
    if (!ok) return;

    setStatus(el.productStatus, 'Deleting product...', 'info');
    requestJson(`${PRODUCT_API_BASE}/${id}`, {
      method: 'DELETE',
    })
      .then(async () => {
        if (state.editingProductId === id) {
          clearProductForm();
        }
        await loadProducts();
        setStatus(el.productStatus, 'Product deleted successfully.', 'ok');
      })
      .catch(error => {
        setStatus(el.productStatus, toErrorMessage(error, 'Failed to delete product.'), 'error');
      });
  }
}

function parsePrebuiltPartsJson(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) {
    return {};
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Parts JSON is invalid. Please provide a valid object.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Parts JSON must be an object.');
  }

  const normalized = {};
  Object.entries(parsed).forEach(([category, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    const partName = String(value.name || '').trim();
    if (!partName) {
      return;
    }

    normalized[category] = { name: partName };
  });

  return normalized;
}

function readPrebuiltForm() {
  return {
    presetId: el.prebuiltPresetId.value.trim(),
    name: el.prebuiltName.value.trim(),
    tagline: el.prebuiltTagline.value.trim(),
    tier: el.prebuiltTier.value,
    estimatedPrice: el.prebuiltEstimatedPrice.value.trim(),
    order: Number(el.prebuiltOrder.value || 0),
    parts: parsePrebuiltPartsJson(el.prebuiltPartsJson.value),
  };
}

function setPrebuiltFormMode(editing) {
  state.editingFeaturedBuildId = editing ? el.prebuiltId.value : null;
  el.prebuiltSubmitBtn.textContent = editing ? 'Update Pre-Built' : 'Create Pre-Built';
  el.prebuiltPresetId.disabled = editing;
}

function clearPrebuiltForm() {
  el.prebuiltForm.reset();
  el.prebuiltId.value = '';
  el.prebuiltTier.value = 'mid';
  el.prebuiltOrder.value = 0;
  el.prebuiltPartsJson.value = '';
  setPrebuiltFormMode(false);
}

function fillPrebuiltForm(build) {
  el.prebuiltId.value = build._id || '';
  el.prebuiltPresetId.value = build.presetId || '';
  el.prebuiltName.value = build.name || '';
  el.prebuiltTagline.value = build.tagline || '';
  el.prebuiltTier.value = build.tier || 'mid';
  el.prebuiltEstimatedPrice.value = build.estimatedPrice || '';
  el.prebuiltOrder.value = Number(build.order || 0);
  const partsObject = build.parts && typeof build.parts === 'object' ? build.parts : {};
  el.prebuiltPartsJson.value = JSON.stringify(partsObject, null, 2);
  setPrebuiltFormMode(true);
}

function renderPrebuiltTable(builds) {
  if (!el.prebuiltTableBody) return;

  if (!builds.length) {
    el.prebuiltTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No pre-built PCs found.</td></tr>';
    return;
  }

  el.prebuiltTableBody.innerHTML = builds
    .map(build => {
      const id = escapeHtml(build._id || '');
      return `
        <tr>
          <td>${escapeHtml(build.presetId || '-')}</td>
          <td>${escapeHtml(build.name || '-')}</td>
          <td>${escapeHtml(String(build.tier || '-').toUpperCase())}</td>
          <td>${Number(build.order || 0)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-sm btn-outline-primary" data-action="edit-prebuilt" data-id="${id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete-prebuilt" data-id="${id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function filterPrebuiltBuilds() {
  const keyword = (el.prebuiltSearch.value || '').toLowerCase().trim();
  if (!keyword) {
    renderPrebuiltTable(state.featuredBuilds);
    return;
  }

  const filtered = state.featuredBuilds.filter(build => {
    return [build.presetId, build.name, build.tagline]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword));
  });

  renderPrebuiltTable(filtered);
}

async function loadFeaturedBuilds() {
  setStatus(el.prebuiltStatus, 'Loading pre-built PCs...', 'info');
  try {
    const payload = await requestJson(FEATURED_BUILD_API_BASE);
    const builds = Array.isArray(payload) ? payload : [];
    state.featuredBuilds = builds.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    filterPrebuiltBuilds();
    updateConsoleMetrics();
    setStatus(el.prebuiltStatus, `Loaded ${state.featuredBuilds.length} pre-built PC(s).`, 'ok');
  } catch (error) {
    setStatus(el.prebuiltStatus, toErrorMessage(error, 'Failed to load pre-built PCs.'), 'error');
  }
}

async function submitPrebuiltForm(event) {
  event.preventDefault();

  let payload;
  try {
    payload = readPrebuiltForm();
  } catch (error) {
    setStatus(el.prebuiltStatus, toErrorMessage(error, 'Invalid pre-built data.'), 'error');
    return;
  }

  if (!payload.presetId || !payload.name) {
    setStatus(el.prebuiltStatus, 'Preset ID and Name are required.', 'error');
    return;
  }

  if (!state.editingFeaturedBuildId) {
    setStatus(el.prebuiltStatus, 'Creating pre-built PC...', 'info');
    try {
      await requestJson(FEATURED_BUILD_API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      clearPrebuiltForm();
      await loadFeaturedBuilds();
      setStatus(el.prebuiltStatus, 'Pre-built PC created successfully.', 'ok');
    } catch (error) {
      setStatus(el.prebuiltStatus, toErrorMessage(error, 'Failed to create pre-built PC.'), 'error');
    }
    return;
  }

  setStatus(el.prebuiltStatus, 'Updating pre-built PC...', 'info');
  try {
    await requestJson(`${FEATURED_BUILD_API_BASE}/${state.editingFeaturedBuildId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    clearPrebuiltForm();
    await loadFeaturedBuilds();
    setStatus(el.prebuiltStatus, 'Pre-built PC updated successfully.', 'ok');
  } catch (error) {
    setStatus(el.prebuiltStatus, toErrorMessage(error, 'Failed to update pre-built PC.'), 'error');
  }
}

function handlePrebuiltTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  if (!id || !action) return;

  const selectedBuild = state.featuredBuilds.find(item => item._id === id);
  if (!selectedBuild) {
    setStatus(el.prebuiltStatus, 'Selected pre-built PC was not found.', 'error');
    return;
  }

  if (action === 'edit-prebuilt') {
    fillPrebuiltForm(selectedBuild);
    setStatus(el.prebuiltStatus, `Editing pre-built PC: ${selectedBuild.name}`, 'info');
    return;
  }

  if (action === 'delete-prebuilt') {
    const ok = window.confirm(`Delete pre-built PC ${selectedBuild.name}?`);
    if (!ok) return;

    setStatus(el.prebuiltStatus, 'Deleting pre-built PC...', 'info');
    requestJson(`${FEATURED_BUILD_API_BASE}/${id}`, {
      method: 'DELETE',
    })
      .then(async () => {
        if (state.editingFeaturedBuildId === id) {
          clearPrebuiltForm();
        }
        await loadFeaturedBuilds();
        setStatus(el.prebuiltStatus, 'Pre-built PC deleted successfully.', 'ok');
      })
      .catch(error => {
        setStatus(el.prebuiltStatus, toErrorMessage(error, 'Failed to delete pre-built PC.'), 'error');
      });
  }
}

function bindEvents() {
  el.saveAdminIdBtn.addEventListener('click', saveAdminUserId);

  el.userForm.addEventListener('submit', submitUserForm);
  el.userResetBtn.addEventListener('click', clearUserForm);
  el.userSearch.addEventListener('input', filterUsers);
  el.reloadUsersBtn.addEventListener('click', loadUsers);
  el.usersTableBody.addEventListener('click', handleUserTableClick);

  el.productForm.addEventListener('submit', submitProductForm);
  el.productResetBtn.addEventListener('click', clearProductForm);
  el.reloadProductsBtn.addEventListener('click', loadProducts);
  el.productSearch.addEventListener('input', loadProducts);
  el.productCategoryFilter.addEventListener('change', loadProducts);
  el.productsTableBody.addEventListener('click', handleProductTableClick);
  if (el.productImageFile) {
    el.productImageFile.addEventListener('change', handleProductImageFileChange);
  }

  if (el.reloadLogsBtn) {
    el.reloadLogsBtn.addEventListener('click', loadLogs);
  }
  if (el.clearAllLogsBtn) {
    el.clearAllLogsBtn.addEventListener('click', clearAllLogs);
  }
  if (el.logsTableBody) {
    el.logsTableBody.addEventListener('click', handleLogTableClick);
  }
  if (el.logSearch) {
    el.logSearch.addEventListener('input', refreshLogsView);
  }
  if (el.logSuspiciousOnly) {
    el.logSuspiciousOnly.addEventListener('change', refreshLogsView);
  }
  if (el.logLimit) {
    el.logLimit.addEventListener('change', loadLogs);
  }
  if (el.logAutoRefresh) {
    el.logAutoRefresh.addEventListener('change', toggleLogAutoRefresh);
  }

  if (el.prebuiltForm) {
    el.prebuiltForm.addEventListener('submit', submitPrebuiltForm);
  }
  if (el.prebuiltResetBtn) {
    el.prebuiltResetBtn.addEventListener('click', clearPrebuiltForm);
  }
  if (el.prebuiltSearch) {
    el.prebuiltSearch.addEventListener('input', filterPrebuiltBuilds);
  }
  if (el.reloadPrebuiltBtn) {
    el.reloadPrebuiltBtn.addEventListener('click', loadFeaturedBuilds);
  }
  if (el.prebuiltTableBody) {
    el.prebuiltTableBody.addEventListener('click', handlePrebuiltTableClick);
  }

  el.adminNavButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.adminTarget;
      if (target) {
        switchAdminSection(target);
      }
    });
  });
}

async function init() {
  const isLoggedIn = getAuthStateSafe();
  const profile = getProfileSafe();
  const role = (profile.role || 'user').toLowerCase();

  if (!isLoggedIn || role !== 'admin') {
    setWorkspaceAccess(false);
    if (el.globalStatus) {
      setStatus(el.globalStatus, 'You do not have permission to access the Admin Dashboard.', 'error');
    }
    return;
  }

  setWorkspaceAccess(true);

  const savedAdminId = localStorage.getItem('adminUserId') || profile.userId || localStorage.getItem('userId') || '';
  el.adminUserId.value = savedAdminId;

  initCategoryOptions();
  clearUserForm();
  clearProductForm();
  clearPrebuiltForm();
  updateConsoleSurface('usersSection');
  updateConsoleMetrics();
  bindEvents();
  switchAdminSection('usersSection');

  setStatus(el.globalStatus, 'Admin page ready.', 'info');
  await Promise.all([loadUsers(), loadProducts(), loadFeaturedBuilds(), loadLogs()]);
}

init();
