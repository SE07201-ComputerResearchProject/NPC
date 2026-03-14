const API_BASE = 'http://localhost:3000/api';
const USER_API_BASE = `${API_BASE}/users`;
const PRODUCT_API_BASE = `${API_BASE}/components`;

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

const state = {
  users: [],
  products: [],
  editingUserId: null,
  editingProductId: null,
};

const el = {
  adminUserId: document.getElementById('adminUserId'),
  saveAdminIdBtn: document.getElementById('saveAdminIdBtn'),
  globalStatus: document.getElementById('globalStatus'),
  adminAccessPanel: document.getElementById('adminAccessPanel'),
  adminWorkspace: document.getElementById('adminWorkspace'),
  adminUnauthorized: document.getElementById('adminUnauthorized'),

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
  productHighlights: document.getElementById('productHighlights'),
  productDescription: document.getElementById('productDescription'),
  productSubmitBtn: document.getElementById('productSubmitBtn'),
  productResetBtn: document.getElementById('productResetBtn'),
  productCategoryFilter: document.getElementById('productCategoryFilter'),
  productSearch: document.getElementById('productSearch'),
  reloadProductsBtn: document.getElementById('reloadProductsBtn'),
  productsTableBody: document.querySelector('#productsTable tbody'),
  productStatus: document.getElementById('productStatus'),
};

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

async function requestJson(url, options = {}) {
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

  return {
    category: el.productCategory.value,
    name: el.productName.value.trim(),
    brand: el.productBrand.value.trim(),
    price: Number(el.productPrice.value),
    power: Number(el.productPower.value || 0),
    stock: Number(el.productStock.value || 0),
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
    renderProductsTable(state.products);
    setStatus(el.productStatus, `Loaded ${state.products.length} products.`, 'ok');
  } catch (error) {
    setStatus(el.productStatus, toErrorMessage(error, 'Failed to load products.'), 'error');
  }
}

async function submitProductForm(event) {
  event.preventDefault();

  const adminId = ensureAdminUserId();
  if (!adminId) return;

  const payload = readProductForm();
  if (!payload.category || !payload.name || Number.isNaN(payload.price)) {
    setStatus(el.productStatus, 'Category, Name, and Price are required.', 'error');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': adminId,
  };

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

    const adminId = ensureAdminUserId();
    if (!adminId) return;

    setStatus(el.productStatus, 'Deleting product...', 'info');
    requestJson(`${PRODUCT_API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': adminId,
      },
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
  bindEvents();

  setStatus(el.globalStatus, 'Admin page ready.', 'info');
  await Promise.all([loadUsers(), loadProducts()]);
}

init();
