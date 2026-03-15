const PAYMENT_API_BASE_URL = 'http://localhost:3000/api/payments';

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString()} VND`;
}

function getCartTotals(items) {
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);

  return {
    totalItems,
    subtotal,
    shipping: 0,
    total: subtotal,
  };
}

function buildCartItemMarkup(item) {
  const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);

  return `
    <article class="cart-item" data-item-id="${item._id}">
      <div class="cart-item-main">
        <div class="cart-item-title">${item.name}</div>
        <p class="cart-item-meta">${item.brand || 'Generic'} · ${(item.category || '').toUpperCase()} · ${Number(item.power || 0)}W</p>
      </div>
      <div class="cart-item-price">${formatCurrency(item.price)}</div>
      <label class="cart-item-qty">
        <span>Qty</span>
        <input type="number" min="1" value="${Number(item.quantity || 1)}" data-action="update-qty" data-id="${item._id}">
      </label>
      <div class="cart-item-total">${formatCurrency(itemTotal)}</div>
      <button class="btn btn-sm btn-outline-danger" data-action="remove-item" data-id="${item._id}">Remove</button>
    </article>
  `;
}

function renderCart() {
  const items = getCart();
  const container = document.getElementById('cartItemsContainer');

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <h3>Your cart is empty</h3>
        <p>Add components from Products page to start checkout.</p>
        <a href="products.html" class="btn btn-primary">Browse Components</a>
      </div>
    `;
  } else {
    container.innerHTML = items.map(buildCartItemMarkup).join('');
  }

  const totals = getCartTotals(items);
  document.getElementById('summaryItems').textContent = String(totals.totalItems);
  document.getElementById('summarySubtotal').textContent = formatCurrency(totals.subtotal);
  document.getElementById('summaryShipping').textContent = formatCurrency(totals.shipping);
  document.getElementById('summaryTotal').textContent = formatCurrency(totals.total);
}

function bindCartEvents() {
  const container = document.getElementById('cartItemsContainer');
  const clearBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutCartBtn');

  if (container) {
    container.addEventListener('click', async event => {
      const removeBtn = event.target.closest('[data-action="remove-item"]');
      if (!removeBtn) return;

      const id = removeBtn.dataset.id;
      try {
        await removeFromCart(id);
        renderCart();
        showPopup('Item removed from cart');
      } catch (error) {
        showPopup(error.message || 'Cannot remove item right now.');
      }
    });

    container.addEventListener('change', async event => {
      const qtyInput = event.target.closest('[data-action="update-qty"]');
      if (!qtyInput) return;

      const id = qtyInput.dataset.id;
      const nextQty = Math.max(1, Number(qtyInput.value) || 1);
      try {
        await updateCartQuantity(id, nextQty);
        renderCart();
      } catch (error) {
        showPopup(error.message || 'Cannot update quantity right now.');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!getCart().length) return;
      const ok = window.confirm('Clear all items in cart?');
      if (!ok) return;

      try {
        await clearCart();
        renderCart();
        showPopup('Cart cleared');
      } catch (error) {
        showPopup(error.message || 'Cannot clear cart right now.');
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }
}

async function handleCheckout() {
  if (!getAuthToken()) {
    showPopup('Please log in before checkout.');
    toggleAuthPopup(new Event('click'));
    return;
  }

  const items = getCart();
  if (!items.length) {
    showPopup('Your cart is empty.');
    return;
  }

  const { total, totalItems } = getCartTotals(items);
  if (!Number.isFinite(total) || total <= 0) {
    showPopup('Invalid cart total.');
    return;
  }

  try {
    const orderPayload = await createCheckoutOrder('cart');
    const orderId = orderPayload?.order?.id;
    if (!orderId) {
      showPopup('Cannot create order from cart.');
      return;
    }

    const response = await fetch(`${PAYMENT_API_BASE_URL}/vnpay/create`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        orderId,
        orderInfo: `Thanh toan gio hang (${totalItems} san pham)`,
        orderType: 'other',
        language: 'vn',
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.paymentUrl) {
      showPopup(payload.message || 'Cannot create payment URL. Please verify VNPay env settings.');
      return;
    }

    window.location.href = payload.paymentUrl;
  } catch (error) {
    showPopup('Cannot connect to payment server.');
  }
}

async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('paymentStatus');
  if (!status) return;

  if (status === 'success') {
    await clearCart().catch(() => null);
    renderCart();
    showPopup('Payment successful. Thank you for your order!');
  } else {
    showPopup('Payment failed or cancelled. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.awaitCommerceStateReady) {
    await window.awaitCommerceStateReady();
  }

  renderCart();
  bindCartEvents();
  await handlePaymentReturn();
});
