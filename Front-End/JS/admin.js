const API_BASE = 'http://127.0.0.1:3001/api';
const USER_API_BASE = `${API_BASE}/users`;
const PRODUCT_API_BASE = `${API_BASE}/components`;
const LOG_API_BASE = `${API_BASE}/logs`;
const FEATURED_BUILD_API_BASE = `${API_BASE}/featured-builds`;
const ORDER_API_BASE = `${API_BASE}/orders`;

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
  orders: [],
  activeOrderId: null,
  editingUserId: null,
  editingProductId: null,
  editingProductImageUrls: [],
  pendingProductImageUrls: [],
  editingFeaturedBuildId: null,
  logAutoRefreshTimer: null,
};

const ADMIN_MODULES = {
  usersSection: {
    cluster: 'Identity Model',
    label: 'Manage User',
    description: 'Manage accounts, profile details, and role visibility from one place.',
    stageCopy: 'Create, update, search, and inspect user records inside the main dashboard area.',
  },
  productsSection: {
    cluster: 'Catalog Model',
    label: 'Manage Product',
    description: 'Update component catalog data including category, stock, pricing, and gallery images.',
    stageCopy: 'Run product CRUD operations with filters for category and keyword-driven search.',
  },
  prebuiltSection: {
    cluster: 'Catalog Model',
    label: 'Manage Pre-Built',
    description: 'Control preset PCs, tier tags, display order, and structured parts payloads.',
    stageCopy: 'Compose and maintain featured build presets through a single editing surface.',
  },
  logsSection: {
    cluster: 'Monitoring Model',
    label: 'View Logs',
    description: 'Review recent events, isolate suspicious activity, and auto-refresh the stream.',
    stageCopy: 'Monitor the latest log entries with quick filters and activity severity markers.',
  },
  ordersSection: {
    cluster: 'Sales Model',
    label: 'View Orders',
    description: 'Inspect who ordered, what they bought, and the current payment status.',
    stageCopy: 'Browse all order history with filters for source, status, and customer keywords.',
  },
  analyticsSection: {
    cluster: 'Sales Model',
    label: 'Data Analyst',
    description: 'Track paid revenue, sold units, top products, and status-level performance.',
    stageCopy: 'Analyze live order data to understand sales output and revenue trends.',
  },
};

const el = {
  adminShell: document.getElementById('adminShell'),
  adminDeniedFull: document.getElementById('adminDeniedFull'),
  adminUserId: document.getElementById('adminUserId'),
  saveAdminIdBtn: document.getElementById('saveAdminIdBtn'),
  globalStatus: document.getElementById('globalStatus'),
  adminAccessPanel: document.getElementById('adminAccessPanel'),
  adminWorkspace: document.getElementById('adminWorkspace'),
  adminUnauthorized: document.getElementById('adminUnauthorized'),
  adminNavButtons: Array.from(document.querySelectorAll('[data-admin-target]')),
  activeModuleGroup: document.getElementById('activeModuleGroup'),
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
  ordersCount: document.getElementById('ordersCount'),
  revenueCount: document.getElementById('revenueCount'),

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
  logCategoryFilter: document.getElementById('logCategoryFilter'),
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
  partsBuilderRows: document.getElementById('partsBuilderRows'),
  addPartRowBtn: document.getElementById('addPartRowBtn'),
  prebuiltSubmitBtn: document.getElementById('prebuiltSubmitBtn'),
  prebuiltResetBtn: document.getElementById('prebuiltResetBtn'),
  prebuiltSearch: document.getElementById('prebuiltSearch'),
  reloadPrebuiltBtn: document.getElementById('reloadPrebuiltBtn'),
  prebuiltTableBody: document.querySelector('#prebuiltTable tbody'),
  prebuiltStatus: document.getElementById('prebuiltStatus'),

  reloadOrdersBtn: document.getElementById('reloadOrdersBtn'),
  orderSearch: document.getElementById('orderSearch'),
  orderStatusFilter: document.getElementById('orderStatusFilter'),
  orderSourceFilter: document.getElementById('orderSourceFilter'),
  ordersTableBody: document.querySelector('#ordersTable tbody'),
  orderStatus: document.getElementById('orderStatus'),
  orderDetailPanel: document.getElementById('orderDetailPanel'),
  orderDetailContent: document.getElementById('orderDetailContent'),

  reloadAnalyticsBtn: document.getElementById('reloadAnalyticsBtn'),
  analyticsRevenueValue: document.getElementById('analyticsRevenueValue'),
  analyticsOrderCount: document.getElementById('analyticsOrderCount'),
  analyticsUnitsSold: document.getElementById('analyticsUnitsSold'),
  analyticsAverageOrder: document.getElementById('analyticsAverageOrder'),
  analyticsTopItems: document.getElementById('analyticsTopItems'),
  analyticsByStatus: document.getElementById('analyticsByStatus'),
};

function updateConsoleSurface(targetId) {
  const moduleMeta = ADMIN_MODULES[targetId] || ADMIN_MODULES.usersSection;

  if (el.activeModuleGroup) {
    el.activeModuleGroup.textContent = moduleMeta.cluster;
  }
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
  if (el.ordersCount) {
    el.ordersCount.textContent = String(state.orders.length);
  }
  if (el.revenueCount) {
    const paidRevenue = state.orders
      .filter(order => normalizeOrderStatus(order) === 'paid')
      .reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);
    el.revenueCount.textContent = `${Number(paidRevenue).toLocaleString()} VND`;
  }
}

function switchAdminSection(targetId) {
  const moduleIds = ['usersSection', 'productsSection', 'prebuiltSection', 'logsSection', 'ordersSection', 'analyticsSection'];
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
  if (el.adminShell) {
    el.adminShell.classList.toggle('d-none', !isAllowed);
  }
  if (el.adminDeniedFull) {
    el.adminDeniedFull.classList.toggle('d-none', isAllowed);
  }
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

function formatMoney(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString()} VND`;
}

function normalizeOrderStatus(order) {
  const raw = String(order?.status || '').toLowerCase().trim();
  const responseCode = String(order?.payment?.responseCode || '').trim();

  if (raw === 'paid') return 'paid';
  if (raw === 'pending') return 'pending';
  if (raw === 'failed') return 'failed';
  if (raw === 'cancelled' || raw === 'canceled' || raw === 'cancel') return 'cancelled';
  if (['failure', 'declined', 'error', 'payment_failed', 'failed_payment'].includes(raw)) return 'failed';

  if (responseCode && responseCode !== '00') {
    return 'failed';
  }

  if (order?.payment?.paidAt) {
    return 'paid';
  }

  return 'pending';
}

function getOrderBuyerLabel(order) {
  const fullName = String(order?.user?.fullName || '').trim();
  const username = String(order?.user?.username || '').trim();
  if (fullName) return fullName;
  if (username) return username;
  return 'Unknown user';
}

function getOrderBuyerSubLabel(order) {
  const email = String(order?.user?.email || '').trim();
  if (email) return email;
  const userId = String(order?.user?.id || '').trim();
  if (userId) return userId;
  return '-';
}

function getOrderItemsPreview(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return { title: 'No items', sub: '-' };

  const title = items
    .slice(0, 2)
    .map(item => String(item?.name || '').trim())
    .filter(Boolean)
    .join(', ') || 'Unnamed item';

  const totalQty = items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
  const extra = items.length > 2 ? ` +${items.length - 2} more` : '';
  const sub = `${totalQty} unit(s)${extra}`;
  return { title, sub };
}

function getOrderIdentityKey(order) {
  const id = String(order?.user?.id || '').trim();
  if (id) return `id:${id}`;

  const email = String(order?.user?.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;

  const username = String(order?.user?.username || '').trim().toLowerCase();
  if (username) return `username:${username}`;

  return '';
}

function renderOrderDetailPanel(order) {
  if (!el.orderDetailContent) return;

  if (!order) {
    el.orderDetailContent.innerHTML = 'Select an order to view customer details.';
    return;
  }

  const buyerLabel = escapeHtml(getOrderBuyerLabel(order));
  const buyerSub = escapeHtml(getOrderBuyerSubLabel(order));
  const orderCode = escapeHtml(String(order?.id || '-'));
  const createdAt = escapeHtml(formatDateTime(order?.createdAt));
  const updatedAt = escapeHtml(formatDateTime(order?.updatedAt));
  const source = escapeHtml(String(order?.source || '-').toUpperCase());
  const status = escapeHtml(normalizeOrderStatus(order).toUpperCase());
  const total = escapeHtml(formatMoney(order?.totalAmount));
  const orderInfo = escapeHtml(String(order?.orderInfo || '-'));

  const items = Array.isArray(order?.items) ? order.items : [];
  const itemsRows = items.length
    ? items.map(item => `
        <tr>
          <td>${escapeHtml(String(item?.name || '-'))}</td>
          <td>${escapeHtml(String(item?.category || '-'))}</td>
          <td>${escapeHtml(String(item?.quantity || 0))}</td>
          <td>${escapeHtml(formatMoney(item?.price || 0))}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" class="empty-state">No items in this order.</td></tr>';

  const currentKey = getOrderIdentityKey(order);
  const customerOrders = currentKey
    ? state.orders.filter(item => getOrderIdentityKey(item) === currentKey)
    : [];

  const historyRows = customerOrders.length
    ? customerOrders
      .slice(0, 8)
      .map(item => {
        const isCurrent = String(item?.id || '') === String(order?.id || '');
        const currentBadge = isCurrent ? ' (current)' : '';
        return `
          <tr>
            <td>${escapeHtml(formatDateTime(item?.createdAt))}</td>
            <td>${escapeHtml(normalizeOrderStatus(item).toUpperCase())}</td>
            <td>${escapeHtml(formatMoney(item?.totalAmount || 0))}</td>
            <td>${escapeHtml(String(item?.source || '-').toUpperCase())}${currentBadge}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="4" class="empty-state">No other orders found for this customer.</td></tr>';

  el.orderDetailContent.innerHTML = `
    <div class="order-detail-meta">
      <div><strong>Customer:</strong> ${buyerLabel}</div>
      <div><strong>Contact:</strong> ${buyerSub}</div>
      <div><strong>Order ID:</strong> ${orderCode}</div>
      <div><strong>Status:</strong> ${status}</div>
      <div><strong>Source:</strong> ${source}</div>
      <div><strong>Total:</strong> ${total}</div>
      <div><strong>Created:</strong> ${createdAt}</div>
      <div><strong>Updated:</strong> ${updatedAt}</div>
    </div>

    <p class="order-detail-note"><strong>Order Info:</strong> ${orderInfo}</p>

    <div class="order-detail-grid">
      <section class="order-detail-card">
        <h4>Ordered Items</h4>
        <div class="table-wrap">
          <table class="table table-sm table-hover align-middle">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
        </div>
      </section>

      <section class="order-detail-card">
        <h4>Customer Order History</h4>
        <div class="table-wrap">
          <table class="table table-sm table-hover align-middle">
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Total</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>${historyRows}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderOrdersTable(ordersToRender) {
  if (!el.ordersTableBody) return;

  if (!ordersToRender.length) {
    el.ordersTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No orders found.</td></tr>';
    state.activeOrderId = null;
    renderOrderDetailPanel(null);
    return;
  }

  el.ordersTableBody.innerHTML = ordersToRender
    .map(order => {
      const buyerLabel = escapeHtml(getOrderBuyerLabel(order));
      const buyerSub = escapeHtml(getOrderBuyerSubLabel(order));
      const source = escapeHtml(String(order?.source || '-').toUpperCase());
      const status = normalizeOrderStatus(order);
      const safeStatus = escapeHtml(status);
      const statusClass = status;
      const createdAt = escapeHtml(formatDateTime(order?.createdAt));
      const money = escapeHtml(formatMoney(order?.totalAmount));
      const itemsPreview = getOrderItemsPreview(order);
      const itemTitle = escapeHtml(itemsPreview.title);
      const itemSub = escapeHtml(itemsPreview.sub);
      const orderId = escapeHtml(String(order?.id || ''));
      const isActive = String(state.activeOrderId || '') === String(order?.id || '');
      const detailLabel = isActive ? 'Selected' : 'View';

      return `
        <tr>
          <td>${createdAt}</td>
          <td>
            <div class="order-customer">
              <strong>${buyerLabel}</strong>
              <span>${buyerSub}</span>
            </div>
          </td>
          <td>${source}</td>
          <td>
            <div class="order-items">
              <strong>${itemTitle}</strong>
              <span>${itemSub}</span>
            </div>
          </td>
          <td>${money}</td>
          <td><span class="order-status-badge ${statusClass}">${safeStatus}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-action="view-order-detail" data-id="${orderId}">${detailLabel}</button>
          </td>
        </tr>
      `;
    })
    .join('');

  const activeOrder = ordersToRender.find(item => String(item?.id || '') === String(state.activeOrderId || ''));
  if (activeOrder) {
    renderOrderDetailPanel(activeOrder);
  } else {
    state.activeOrderId = null;
    renderOrderDetailPanel(null);
  }
}

function handleOrdersTableClick(event) {
  const button = event.target.closest('button[data-action="view-order-detail"]');
  if (!button) return;

  const orderId = String(button.dataset.id || '');
  if (!orderId) return;

  const selectedOrder = state.orders.find(order => String(order?.id || '') === orderId);
  if (!selectedOrder) return;

  state.activeOrderId = orderId;
  renderOrderDetailPanel(selectedOrder);
  filterOrders();
}

function filterOrders() {
  const keyword = (el.orderSearch?.value || '').toLowerCase().trim();
  const statusFilter = String(el.orderStatusFilter?.value || 'all').toLowerCase();
  const sourceFilter = String(el.orderSourceFilter?.value || 'all').toLowerCase();

  const filtered = state.orders.filter(order => {
    const status = normalizeOrderStatus(order);
    const source = String(order?.source || '').toLowerCase();
    const buyer = `${order?.user?.fullName || ''} ${order?.user?.username || ''} ${order?.user?.email || ''}`.toLowerCase();
    const info = `${order?.orderInfo || ''} ${(order?.items || []).map(item => item?.name || '').join(' ')}`.toLowerCase();

    const keywordMatch = !keyword || buyer.includes(keyword) || info.includes(keyword);
    const statusMatch = statusFilter === 'all' || status === statusFilter;
    const sourceMatch = sourceFilter === 'all' || source === sourceFilter;
    return keywordMatch && statusMatch && sourceMatch;
  });

  renderOrdersTable(filtered);
  if (el.orderStatus) {
    setStatus(el.orderStatus, `Showing ${filtered.length}/${state.orders.length} order(s).`, 'ok');
  }
}

function renderAnalyticsList(target, rows, emptyMessage) {
  if (!target) return;

  if (!rows.length) {
    target.innerHTML = `<div class="analytics-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  target.innerHTML = rows
    .map(row => {
      return `
        <div class="analytics-list-item">
          <strong>${escapeHtml(row.title)}</strong>
          <span>${escapeHtml(row.sub)}</span>
        </div>
      `;
    })
    .join('');
}

function renderAnalytics() {
  const paidOrders = state.orders.filter(order => normalizeOrderStatus(order) === 'paid');
  const paidRevenue = paidOrders.reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);
  const unitsSold = paidOrders.reduce((sum, order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    return sum + items.reduce((itemSum, item) => itemSum + Number(item?.quantity || 0), 0);
  }, 0);
  const avgOrder = paidOrders.length ? Math.round(paidRevenue / paidOrders.length) : 0;

  if (el.analyticsRevenueValue) el.analyticsRevenueValue.textContent = formatMoney(paidRevenue);
  if (el.analyticsOrderCount) el.analyticsOrderCount.textContent = String(paidOrders.length);
  if (el.analyticsUnitsSold) el.analyticsUnitsSold.textContent = String(unitsSold);
  if (el.analyticsAverageOrder) el.analyticsAverageOrder.textContent = formatMoney(avgOrder);

  const productMap = new Map();
  paidOrders.forEach(order => {
    const items = Array.isArray(order?.items) ? order.items : [];
    items.forEach(item => {
      const name = String(item?.name || 'Unknown item').trim() || 'Unknown item';
      const qty = Number(item?.quantity || 0);
      const price = Number(item?.price || 0);

      const current = productMap.get(name) || { qty: 0, revenue: 0 };
      current.qty += qty;
      current.revenue += qty * price;
      productMap.set(name, current);
    });
  });

  const topItems = Array.from(productMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty;
      return b.revenue - a.revenue;
    })
    .slice(0, 6)
    .map(item => ({
      title: item.name,
      sub: `${item.qty} unit(s) | ${formatMoney(item.revenue)}`,
    }));

  const statusMap = new Map();
  state.orders.forEach(order => {
    const status = normalizeOrderStatus(order);
    const current = statusMap.get(status) || { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += Number(order?.totalAmount || 0);
    statusMap.set(status, current);
  });

  const byStatus = Array.from(statusMap.entries())
    .map(([status, stats]) => ({
      status,
      count: stats.count,
      revenue: stats.revenue,
    }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.count - a.count;
    })
    .map(item => ({
      title: item.status.toUpperCase(),
      sub: `${item.count} order(s) | ${formatMoney(item.revenue)}`,
    }));

  renderAnalyticsList(el.analyticsTopItems, topItems, 'No sold item data yet.');
  renderAnalyticsList(el.analyticsByStatus, byStatus, 'No order status data yet.');
}

async function loadOrders() {
  if (!el.orderStatus) return;

  setStatus(el.orderStatus, 'Loading orders...', 'info');
  try {
    const orders = await requestJson(`${ORDER_API_BASE}/admin/list`);
    state.orders = Array.isArray(orders) ? orders : [];
    if (state.activeOrderId) {
      const stillExists = state.orders.some(order => String(order?.id || '') === String(state.activeOrderId));
      if (!stillExists) {
        state.activeOrderId = null;
      }
    }
    updateConsoleMetrics();
    filterOrders();
    renderAnalytics();
  } catch (error) {
    if (isMissingRouteError(error)) {
      setStatus(el.orderStatus, 'Admin order route is not available yet.', 'info');
      if (el.ordersTableBody) {
        el.ordersTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Waiting for Back-End admin order route.</td></tr>';
      }
      state.activeOrderId = null;
      renderOrderDetailPanel(null);
      renderAnalyticsList(el.analyticsTopItems, [], 'No sold item data yet.');
      renderAnalyticsList(el.analyticsByStatus, [], 'No order status data yet.');
      return;
    }

    setStatus(el.orderStatus, toErrorMessage(error, 'Failed to load orders.'), 'error');
    if (el.ordersTableBody) {
      el.ordersTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Cannot load orders.</td></tr>';
    }
    state.activeOrderId = null;
    renderOrderDetailPanel(null);
  }
}

function isSuspiciousLog(log) {
  const content = `${log?.activity || ''} ${log?.user || ''}`.toLowerCase();
  return /(error|fail|invalid|unauthorized|denied|exception|forbidden)/i.test(content);
}

function getLogCategory(log) {
  const content = `${log?.activity || ''} ${log?.user || ''}`.toLowerCase();

  if (/(payment|vnpay|txnref|order)/i.test(content)) {
    return 'payment';
  }

  if (/(login|register|registration|google login|logout|captcha|mfa|password)/i.test(content)) {
    return 'auth';
  }

  if (/(system|error|exception|signature|denied|forbidden|failed)/i.test(content)) {
    return 'system';
  }

  return 'general';
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
      await requestJson(USER_API_BASE, {
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
  const category = el.logCategoryFilter?.value || 'all';
  const suspiciousOnly = Boolean(el.logSuspiciousOnly?.checked);

  return state.logs.filter(log => {
    const haystack = `${log?.user || ''} ${log?.activity || ''}`.toLowerCase();
    const keywordMatch = !keyword || haystack.includes(keyword);
    const categoryMatch = category === 'all' || getLogCategory(log) === category;
    const suspiciousMatch = !suspiciousOnly || isSuspiciousLog(log);
    return keywordMatch && categoryMatch && suspiciousMatch;
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

const PREBUILT_PART_CATEGORIES = [
  { key: 'cpu',         label: 'CPU' },
  { key: 'gpu',         label: 'GPU' },
  { key: 'ram',         label: 'RAM' },
  { key: 'motherboard', label: 'Motherboard' },
  { key: 'psu',         label: 'PSU' },
  { key: 'storage',     label: 'Storage' },
  { key: 'cooler',      label: 'Cooler' },
  { key: 'case',        label: 'Case' },
  { key: 'fan',         label: 'Fan' },
];

function buildPartCategoryOptions(selectedKey) {
  return PREBUILT_PART_CATEGORIES
    .map(c => `<option value="${c.key}"${c.key === selectedKey ? ' selected' : ''}>${c.label}</option>`)
    .join('');
}

function addPrebuiltPartRow(category = 'cpu', name = '') {
  const row = document.createElement('div');
  row.className = 'parts-builder-row';
  row.innerHTML = `
    <select class="form-select parts-row-category">
      ${buildPartCategoryOptions(category)}
    </select>
    <input type="text" class="form-control parts-row-name" placeholder="e.g. Intel Core i7-13700K" value="${escapeHtml(name)}" />
    <button type="button" class="btn btn-outline-danger btn-sm parts-row-remove" title="Remove part">
      <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
    </button>
  `;
  row.querySelector('.parts-row-remove').addEventListener('click', () => row.remove());
  el.partsBuilderRows.appendChild(row);
  if (window.lucide) lucide.createIcons({ nodes: [row] });
}

function readPartsFromBuilder() {
  const result = {};
  el.partsBuilderRows.querySelectorAll('.parts-builder-row').forEach(row => {
    const category = row.querySelector('.parts-row-category').value.trim();
    const name = row.querySelector('.parts-row-name').value.trim();
    if (category && name) {
      result[category] = { name };
    }
  });
  return result;
}

function readPrebuiltForm() {
  return {
    presetId: el.prebuiltPresetId.value.trim(),
    name: el.prebuiltName.value.trim(),
    tagline: el.prebuiltTagline.value.trim(),
    tier: el.prebuiltTier.value,
    estimatedPrice: el.prebuiltEstimatedPrice.value.trim(),
    order: Number(el.prebuiltOrder.value || 0),
    parts: readPartsFromBuilder(),
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
  el.partsBuilderRows.innerHTML = '';
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
  el.partsBuilderRows.innerHTML = '';
  Object.entries(partsObject).forEach(([cat, val]) => {
    addPrebuiltPartRow(cat, val && val.name ? val.name : '');
  });
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
  if (el.logCategoryFilter) {
    el.logCategoryFilter.addEventListener('change', refreshLogsView);
  }
  if (el.logAutoRefresh) {
    el.logAutoRefresh.addEventListener('change', toggleLogAutoRefresh);
  }

  if (el.prebuiltForm) {
    el.prebuiltForm.addEventListener('submit', submitPrebuiltForm);
  }
  if (el.prebuiltResetBtn) {
    el.prebuiltResetBtn.addEventListener('click', clearPrebuiltForm);
    if (el.addPartRowBtn) {
      el.addPartRowBtn.addEventListener('click', () => addPrebuiltPartRow());
    }
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

  if (el.reloadOrdersBtn) {
    el.reloadOrdersBtn.addEventListener('click', loadOrders);
  }
  if (el.orderSearch) {
    el.orderSearch.addEventListener('input', filterOrders);
  }
  if (el.orderStatusFilter) {
    el.orderStatusFilter.addEventListener('change', filterOrders);
  }
  if (el.orderSourceFilter) {
    el.orderSourceFilter.addEventListener('change', filterOrders);
  }
  if (el.ordersTableBody) {
    el.ordersTableBody.addEventListener('click', handleOrdersTableClick);
  }
  if (el.reloadAnalyticsBtn) {
    el.reloadAnalyticsBtn.addEventListener('click', renderAnalytics);
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
  renderOrderDetailPanel(null);

  setStatus(el.globalStatus, 'Admin page ready.', 'info');
  await Promise.all([loadUsers(), loadProducts(), loadFeaturedBuilds(), loadLogs(), loadOrders()]);
}

init();
