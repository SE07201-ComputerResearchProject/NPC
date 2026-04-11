const PAYMENT_API_BASE_URL = 'http://127.0.0.1:3001/api/payments';
const VOUCHER_API_BASE_URL = 'http://127.0.0.1:3001/api/vouchers';
let appliedVoucher = null;

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

function setVoucherStatus(message, type = 'info') {
  const statusEl = document.getElementById('voucherStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove('ok', 'error', 'info');
  statusEl.classList.add(type);
}

function clearAppliedVoucher(options = {}) {
  const { silent = false, message = '' } = options;
  appliedVoucher = null;
  if (!silent) {
    setVoucherStatus(message || 'Voucher has been removed.', 'info');
  }
}

function getVoucherDiscountForSubtotal(subtotal) {
  if (!appliedVoucher) return 0;
  return Math.min(Math.max(0, Number(appliedVoucher.discountAmount || 0)), Math.max(0, Number(subtotal || 0)));
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
    clearAppliedVoucher({ silent: true });
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
  const discountAmount = getVoucherDiscountForSubtotal(totals.subtotal);
  const finalTotal = Math.max(0, totals.total - discountAmount);
  document.getElementById('summaryItems').textContent = String(totals.totalItems);
  document.getElementById('summarySubtotal').textContent = formatCurrency(totals.subtotal);
  document.getElementById('summaryShipping').textContent = formatCurrency(totals.shipping);
  document.getElementById('summaryDiscount').textContent = `-${formatCurrency(discountAmount)}`;
  document.getElementById('summaryTotal').textContent = formatCurrency(finalTotal);
}

async function applyVoucherCode() {
  const input = document.getElementById('voucherCodeInput');
  const code = String(input?.value || '').trim();
  if (!code) {
    clearAppliedVoucher({ message: 'Please enter a voucher code.' });
    renderCart();
    return;
  }

  if (!getAuthToken()) {
    setVoucherStatus('Please log in to apply a voucher.', 'error');
    return;
  }

  if (!getCart().length) {
    setVoucherStatus('Your cart is empty.', 'error');
    return;
  }

  setVoucherStatus('Applying voucher...', 'info');

  try {
    const response = await fetch(`${VOUCHER_API_BASE_URL}/validate-cart`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ code }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'Voucher is invalid or expired');
    }

    appliedVoucher = {
      code: String(payload?.voucher?.code || '').trim(),
      discountPercent: Number(payload?.voucher?.discountPercent || 0),
      maxDiscount: Number(payload?.voucher?.maxDiscount || 0),
      discountAmount: Number(payload?.totals?.discountAmount || 0),
    };

    renderCart();
    setVoucherStatus(
      `Applied ${appliedVoucher.code}: -${formatCurrency(appliedVoucher.discountAmount)} (${appliedVoucher.discountPercent}% up to ${formatCurrency(appliedVoucher.maxDiscount)}).`,
      'ok'
    );
  } catch (error) {
    clearAppliedVoucher({ message: error.message || 'Cannot apply voucher right now.' });
    renderCart();
    setVoucherStatus(error.message || 'Cannot apply voucher right now.', 'error');
  }
}

function bindCartEvents() {
  const container = document.getElementById('cartItemsContainer');
  const clearBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutCartBtn');
  const applyVoucherBtn = document.getElementById('applyVoucherBtn');
  const voucherCodeInput = document.getElementById('voucherCodeInput');

  if (container) {
    container.addEventListener('click', async event => {
      const removeBtn = event.target.closest('[data-action="remove-item"]');
      if (!removeBtn) return;

      const id = removeBtn.dataset.id;
      try {
        await removeFromCart(id);
        clearAppliedVoucher({ message: 'Voucher removed because cart changed.' });
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
        clearAppliedVoucher({ message: 'Voucher removed because cart changed.' });
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
        clearAppliedVoucher({ silent: true });
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

  if (applyVoucherBtn) {
    applyVoucherBtn.addEventListener('click', applyVoucherCode);
  }

  if (voucherCodeInput) {
    voucherCodeInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyVoucherCode();
      }
    });
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

  // Show address modal before checkout
  try {
    const shippingAddress = await showAddressModal();
    if (!shippingAddress) {
      return; // User cancelled
    }

    const orderPayload = await createCheckoutOrder('cart', shippingAddress, appliedVoucher?.code || '');
    const orderId = orderPayload?.order?.id;
    if (!orderId) {
      showPopup('Cannot create order from cart.');
      return;
    }

    const response = await fetch(`${PAYMENT_API_BASE_URL}/momo/create`, {
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
    if (!response.ok || !payload.metadata) {
      showPopup(payload.message || 'Cannot create payment URL. Please verify MoMo env settings.');
      return;
    }

    window.location.href = payload.metadata;
  } catch (error) {
    showPopup('Cannot connect to payment server.');
  }
}

async function mergeCheckoutBuildIntoCart() {
  try {
    const buildCheckoutItemsStr = sessionStorage.getItem('buildCheckoutItems');
    if (!buildCheckoutItemsStr) {
      return; // No build checkout items to merge
    }

    const buildItems = JSON.parse(buildCheckoutItemsStr);
    if (!Array.isArray(buildItems) || buildItems.length === 0) {
      return;
    }

    // Get current cart and merge build items
    if (typeof window.addToCart === 'function') {
      // Use addToCart if available to add items one by one
      for (const item of buildItems) {
        try {
          await window.addToCart(item);
        } catch (e) {
          console.warn('Could not add item to cart:', item, e);
        }
      }
    } else if (typeof window.saveCart === 'function') {
      // Fallback: merge items directly
      const currentCart = typeof window.getCart === 'function' ? window.getCart() : [];
      
      // Merge by avoiding duplicates (same _id)
      const existingIds = new Set(currentCart.map(item => item._id));
      const newItems = buildItems.filter(item => !existingIds.has(item._id));
      
      if (newItems.length > 0) {
        const merged = [...currentCart, ...newItems];
        await window.saveCart(merged);
      }
    }

    // Clear sessionStorage after merge
    sessionStorage.removeItem('buildCheckoutItems');
    showPopup('✓ Build components added to cart');
  } catch (error) {
    console.error('Error merging build checkout items:', error);
  }
}

// Address Modal Functions
async function loadUserAddress() {
  try {
    const headers = getAuthHeaders({});
    const response = await fetch('http://127.0.0.1:3001/api/users/me', { headers });
    if (!response.ok) return null;

    const data = await response.json();
    const user = data.user || data;
    return user.address || null;
  } catch (error) {
    console.error('Error loading user address:', error);
    return null;
  }
}

async function saveUserAddress(address) {
  try {
    const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('http://127.0.0.1:3001/api/users/me', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ address }),
    });

    if (!response.ok) throw new Error('Failed to save address');
    return true;
  } catch (error) {
    console.error('Error saving user address:', error);
    return false;
  }
}

function buildAddressFormMarkup(address = {}) {
  return `
    <div class="address-form-group">
      <label for="addressStreet">Street Address</label>
      <input type="text" id="addressStreet" placeholder="123 Main St" value="${address.street || ''}" />
    </div>
    <div class="address-form-group">
      <label for="addressCity">City</label>
      <input type="text" id="addressCity" placeholder="Ho Chi Minh" value="${address.city || ''}" />
    </div>
    <div class="address-form-group">
      <label for="addressState">State/Province</label>
      <input type="text" id="addressState" placeholder="District 1" value="${address.state || ''}" />
    </div>
    <div class="address-form-group">
      <label for="addressZip">Zip/Postal Code</label>
      <input type="text" id="addressZip" placeholder="70000" value="${address.zip || ''}" />
    </div>
    <div class="address-checkbox">
      <input type="checkbox" id="saveAddressCheckbox" checked />
      <label for="saveAddressCheckbox">Save this address for future orders</label>
    </div>
  `;
}

function buildAddressDisplayMarkup(address) {
  return `
    <div class="address-display">
      <div class="address-display-title">Current Address on File</div>
      <div class="address-display-text">
        ${address.street || 'N/A'}<br/>
        ${address.city || ''} ${address.state || ''} ${address.zip || ''}<br/>
      </div>
    </div>
    <div class="address-form-group">
      <label><strong>Edit Address (Optional)</strong></label>
      <small>Leave fields blank to keep your current address</small>
    </div>
  `;
}

function captureAddressFromForm() {
  return {
    street: document.getElementById('addressStreet')?.value?.trim() || '',
    city: document.getElementById('addressCity')?.value?.trim() || '',
    state: document.getElementById('addressState')?.value?.trim() || '',
    zip: document.getElementById('addressZip')?.value?.trim() || '',
  };
}

function showAddressModal() {
  return new Promise(async (resolve) => {
    const modal = new bootstrap.Modal(document.getElementById('addressModal'));
    const flowDiv = document.getElementById('addressFlow');
    const confirmBtn = document.getElementById('confirmAddressBtn');

    try {
      const savedAddress = await loadUserAddress();
      let isNewUser = !savedAddress || (
        !savedAddress.street && !savedAddress.city && !savedAddress.state && !savedAddress.zip
      );

      // Build modal content
      if (isNewUser) {
        // New user - show input form
        flowDiv.innerHTML = `
          <div>
            <p class="text-muted">Enter your shipping address</p>
            ${buildAddressFormMarkup({})}
          </div>
        `;
      } else {
        // Returning user - show saved address with option to edit
        flowDiv.innerHTML = `
          <div>
            <p class="text-muted">Confirm or update your shipping address</p>
            ${buildAddressDisplayMarkup(savedAddress)}
            ${buildAddressFormMarkup(savedAddress)}
          </div>
        `;
      }

      // Validate address
      function validateAddress(addr) {
        return addr.street && addr.city && addr.state && addr.zip;
      }

      // Handle confirm button
      const onConfirm = async () => {
        const formAddress = captureAddressFromForm();

        // For new users, use form data. For returning users, merge with saved
        let finalAddress = isNewUser ? formAddress : { ...savedAddress };

        // If returning user edited any field, use the new value
        if (!isNewUser) {
          if (formAddress.street) finalAddress.street = formAddress.street;
          if (formAddress.city) finalAddress.city = formAddress.city;
          if (formAddress.state) finalAddress.state = formAddress.state;
          if (formAddress.zip) finalAddress.zip = formAddress.zip;
        }

        if (!validateAddress(finalAddress)) {
          showPopup('Please fill in all address fields.');
          return;
        }

        const shouldSave = document.getElementById('saveAddressCheckbox')?.checked;

        // Save address if new user or if checkbox is checked
        if (isNewUser || shouldSave) {
          const saved = await saveUserAddress(finalAddress);
          if (!saved && isNewUser) {
            showPopup('Warning: Could not save address, but continuing checkout.');
          }
        }

        modal.hide();
        resolve(finalAddress);
      };

      confirmBtn.removeEventListener('click', onConfirm);
      confirmBtn.addEventListener('click', onConfirm);

      // Handle modal dismissal
      document.getElementById('addressModal').addEventListener('hidden.bs.modal', () => {
        resolve(null);
      }, { once: true });

      modal.show();
    } catch (error) {
      console.error('Error in address modal:', error);
      modal.hide();
      resolve(null);
    }
  });
}


document.addEventListener('DOMContentLoaded', async () => {
  if (window.awaitCommerceStateReady) {
    await window.awaitCommerceStateReady();
  }

  // Merge build components from dashboard checkout if present
  await mergeCheckoutBuildIntoCart();

  renderCart();
  bindCartEvents();
});
