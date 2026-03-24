const FAILED_ORDER_API_BASE_URL = 'http://localhost:3001/api/orders';

function formatFailedCurrency(value) {
  return `${Number(value || 0).toLocaleString()} VND`;
}

function getFailedAuthToken() {
  if (typeof getAuthToken === 'function') {
    return getAuthToken() || '';
  }

  return localStorage.getItem('authToken') || '';
}

function getFailedParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function setFailedText(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = value;
}

function updateRetryLink(order) {
  const retryLink = document.getElementById('paymentRetryLink');
  if (!retryLink) return;

  if (order?.source === 'build') {
    retryLink.href = 'dashboard.html';
    retryLink.textContent = 'Retry From Builder';
    return;
  }

  retryLink.href = 'shopping-cart.html';
  retryLink.textContent = 'Retry Cart Checkout';
}

function renderFailedFallback() {
  setFailedText('failedOrderId', getFailedParam('orderId') || '-');
  setFailedText('failedTxnRef', getFailedParam('txnRef') || '-');
  setFailedText('failedPaymentCode', getFailedParam('paymentCode') || '-');
  setFailedText('failedReason', getFailedParam('reason') || 'Transaction was not approved');
  setFailedText('failedOrderSource', 'Unknown');
  setFailedText('failedOrderTotal', '-');
}

async function loadFailedOrder() {
  const orderId = getFailedParam('orderId');
  renderFailedFallback();

  if (!orderId) {
    setFailedText('paymentFailedHeroMessage', 'The payment did not complete and no order id was included in the return URL.');
    return;
  }

  const token = getFailedAuthToken();
  if (!token) {
    setFailedText('paymentFailedHeroMessage', 'The payment did not complete. Sign in to view the full order context and retry from your account.');
    return;
  }

  try {
    const response = await fetch(`${FAILED_ORDER_API_BASE_URL}/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Failed to load order context');
    }

    const order = data?.order ? data.order : data;
    setFailedText('failedOrderId', order.id || orderId);
    setFailedText('failedTxnRef', order.payment?.txnRef || getFailedParam('txnRef') || '-');
    setFailedText('failedPaymentCode', order.payment?.responseCode || getFailedParam('paymentCode') || '-');
    setFailedText('failedReason', getFailedParam('reason') || 'Transaction was not approved');
    setFailedText('failedOrderSource', order.source === 'build' ? `Build: ${order.buildName || 'New Build'}` : 'Shopping Cart');
    setFailedText('failedOrderTotal', formatFailedCurrency(order.totalAmount));
    setFailedText('paymentFailedHeroMessage', `Order ${order.id || orderId} was not paid successfully. You can retry the same checkout flow below.`);
    updateRetryLink(order);
  } catch {
    setFailedText('paymentFailedHeroMessage', 'The payment did not complete and the order detail service is not available right now.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.awaitCommerceStateReady) {
    await window.awaitCommerceStateReady();
  }

  await loadFailedOrder();
  if (window.lucide) {
    window.lucide.createIcons();
  }
});