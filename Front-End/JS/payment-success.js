const ORDER_API_BASE_URL = 'http://127.0.0.1:3001/api/orders';

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString()} VND`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

function getAuthTokenSafe() {
  if (typeof getAuthToken === 'function') {
    return getAuthToken() || '';
  }

  return localStorage.getItem('authToken') || '';
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = value;
}

function renderItems(items = []) {
  const container = document.getElementById('paymentItems');
  const itemCount = document.getElementById('paymentItemCount');
  if (!container || !itemCount) return;

  if (!items.length) {
    itemCount.textContent = '0 items';
    container.innerHTML = '<div class="payment-empty-state">No item details are available for this order.</div>';
    return;
  }

  itemCount.textContent = `${items.length} item${items.length > 1 ? 's' : ''}`;
  container.innerHTML = items
    .map(item => {
      const quantity = Number(item.quantity || 1);
      const total = Number(item.price || 0) * quantity;
      const brand = item.brand || 'Generic';
      const category = String(item.category || '').toUpperCase();

      return `
        <article class="payment-item-row">
          <div>
            <h3 class="payment-item-name">${item.name || 'Unnamed Item'}</h3>
            <p class="payment-item-meta">${brand} · ${category} · Qty ${quantity}</p>
          </div>
          <div class="payment-item-total">${formatCurrency(total)}</div>
        </article>
      `;
    })
    .join('');
}

function updateContinueLink(order) {
  const continueLink = document.getElementById('paymentContinueLink');
  if (!continueLink) return;

  if (order?.source === 'build') {
    continueLink.href = 'dashboard.html';
    continueLink.textContent = 'Back to Builder';
    return;
  }

  continueLink.href = 'products.html';
  continueLink.textContent = 'Continue Shopping';
}

function renderFallbackState() {
  const orderId = getQueryParam('orderId') || '-';
  const txnRef = getQueryParam('txnRef') || '-';
  const paymentCode = getQueryParam('paymentCode') || '-';

  setText('paymentOrderId', orderId);
  setText('paymentTxnRef', txnRef);
  setText('paymentCode', paymentCode);
  setText('paymentPaidAt', 'Confirmed by VNPay');
  setText('paymentSource', 'Online payment');
  setText('paymentTotal', 'Loaded after login');
  renderItems([]);
}

async function loadOrderDetails() {
  const orderId = getQueryParam('orderId');
  if (!orderId) {
    renderFallbackState();
    setText('paymentHeroMessage', 'Payment is confirmed, but no order identifier was included in the return URL.');
    return;
  }

  renderFallbackState();

  const token = getAuthTokenSafe();
  if (!token) {
    setText('paymentHeroMessage', 'Payment is confirmed. Log in to view the full order breakdown on this page.');
    return;
  }

  try {
    const response = await fetch(`${ORDER_API_BASE_URL}/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Failed to load order details');
    }

    const order = data?.order ? data.order : data;
    setText('paymentOrderId', order.id || orderId);
    setText('paymentTxnRef', order.payment?.txnRef || getQueryParam('txnRef') || '-');
    setText('paymentCode', order.payment?.responseCode || getQueryParam('paymentCode') || '-');
    setText('paymentPaidAt', formatDateTime(order.payment?.paidAt || order.payment?.returnedAt));
    setText('paymentSource', order.source === 'build' ? `Build: ${order.buildName || 'New Build'}` : 'Shopping Cart');
    setText('paymentTotal', formatCurrency(order.totalAmount));
    setText('paymentHeroMessage', `Your order ${order.id || orderId} has been paid successfully and is now being prepared.`);
    updateContinueLink(order);
    renderItems(Array.isArray(order.items) ? order.items : []);
  } catch {
    setText('paymentHeroMessage', 'Payment is confirmed, but the order detail API is not available right now.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.awaitCommerceStateReady) {
    await window.awaitCommerceStateReady();
  }

  await loadOrderDetails();
  if (window.lucide) {
    window.lucide.createIcons();
  }
});