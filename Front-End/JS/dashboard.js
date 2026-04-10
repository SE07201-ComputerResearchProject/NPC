// Dashboard functionality for PC Builder

const PAYMENT_API_BASE_URL = 'http://127.0.0.1:3001/api/payments';
const COMPATIBILITY_API_BASE_URL = 'http://127.0.0.1:3001/api/compatibility';

// track authentication state (false until user logs in)
window.isLoggedIn = typeof getAuthState === 'function' ? getAuthState() : false;

const partsCategories = [
  { key: 'case', name: 'Case', power: 0 },
  { key: 'cpu', name: 'CPU', power: 65 },
  { key: 'motherboard', name: 'Motherboard', power: 0 },
  { key: 'gpu', name: 'GPU', power: 250 },
  { key: 'ram', name: 'RAM', power: 3 },
  { key: 'cooler', name: 'CPU Cooler', power: 0 },
  { key: 'storage', name: 'Storage', power: 5 },
  { key: 'psu', name: 'Power Supply', power: 0 },
  { key: 'fan', name: 'Case Fan', power: 0 }
];

let currentBuild = {
  case: null,
  cpu: null,
  motherboard: null,
  gpu: null,
  ram: null,
  cooler: null,
  storage: null,
  psu: null,
  fan: null
};

const COMPONENT_API_BASE_URL = 'http://127.0.0.1:3001/api/components';
// Stores items returned by the last fetchComponentsByCategory call (per category key)
const selectorPageItems = {};
const compatibilityState = {
  requestId: 0,
  debounceTimer: null,
};

async function fetchComponentsByCategory(categoryKey, page = 1) {
  const limit = selectorState.pageSize;
  const res = await fetch(
    `${COMPONENT_API_BASE_URL}?category=${encodeURIComponent(categoryKey)}&page=${page}&limit=${limit}`
  );
  if (!res.ok) throw new Error('Failed to load components');
  // Returns { items, total, page, pages } because limit > 0
  return res.json();
}

const selectorState = {
  pageSize: 9,
  currentPageByCategory: {},
};

const visualizerLabels = {
  case: 'Case',
  cpu: 'CPU',
  motherboard: 'Motherboard',
  gpu: 'GPU',
  ram: 'RAM',
  cooler: 'Cooler',
  storage: 'Storage',
  psu: 'PSU',
  fan: 'Fan',
};

function updateBuildVisualizer() {
  const scene = document.getElementById('buildVisualizerScene');
  const listEl = document.getElementById('buildVisualizerList');
  const hintEl = document.getElementById('buildVisualizerHint');
  const progressEl = document.getElementById('buildProgressValue');
  const progressTextEl = document.getElementById('buildCompletionText');

  if (!scene || !listEl || !hintEl || !progressEl || !progressTextEl) {
    return;
  }

  const selectedCount = partsCategories.reduce((total, part) => {
    return total + (currentBuild[part.key] ? 1 : 0);
  }, 0);

  const totalParts = partsCategories.length;
  const completionRate = Math.round((selectedCount / totalParts) * 100);

  scene.querySelectorAll('.scene-part[data-part]').forEach(partEl => {
    const key = partEl.dataset.part;
    const component = currentBuild[key];
    const valueEl = partEl.querySelector('.scene-part-value');

    partEl.classList.toggle('active', Boolean(component));
    if (valueEl) {
      valueEl.textContent = component ? component.name : 'Not added';
    }
  });

  if (selectedCount === 0) {
    hintEl.textContent = 'Select components from the left panel to light up matching parts in the model on the right.';
  } else {
    hintEl.textContent = `${selectedCount}/${totalParts} components have been added to the current build.`;
  }

  progressEl.style.width = `${completionRate}%`;
  progressTextEl.textContent = `${completionRate}%`;

  listEl.innerHTML = partsCategories
    .map(part => {
      const component = currentBuild[part.key];
      const stateClass = component ? 'is-on' : '';
      const stateText = component ? component.name : 'Not added';

      return `
        <li class="${stateClass}">
          <span class="part-pill">${visualizerLabels[part.key] || part.name}</span>
          <span class="part-state">${stateText}</span>
        </li>
      `;
    })
    .join('');
}

function getSelectorPage(categoryKey) {
  return selectorState.currentPageByCategory[categoryKey] || 1;
}

function setSelectorPage(categoryKey, page) {
  selectorState.currentPageByCategory[categoryKey] = Math.max(1, Number(page) || 1);
}

function buildSelectorPagination(categoryKey, currentPage, totalPages) {
  if (totalPages <= 1) {
    return '';
  }

  const pageButtons = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pageButtons.push(`
      <button
        type="button"
        class="selector-page-btn ${page === currentPage ? 'active' : ''}"
        onclick="showComponentSelector('${categoryKey}', ${page})"
      >
        ${page}
      </button>
    `);
  }

  return `
    <div class="selector-pagination">
      <button
        type="button"
        class="selector-page-btn"
        onclick="showComponentSelector('${categoryKey}', ${currentPage - 1})"
        ${currentPage === 1 ? 'disabled' : ''}
      >
        Prev
      </button>
      ${pageButtons.join('')}
      <button
        type="button"
        class="selector-page-btn"
        onclick="showComponentSelector('${categoryKey}', ${currentPage + 1})"
        ${currentPage === totalPages ? 'disabled' : ''}
      >
        Next
      </button>
    </div>
  `;
}

function renderPartsList() {
  const partsList = document.getElementById('partsList');
  let html = '';

  partsCategories.forEach(category => {
    const selected = currentBuild[category.key];

    const selectedImageUrl = selected && typeof selected.imageUrl === 'string' ? selected.imageUrl.trim() : '';
    const imageField = selectedImageUrl
      ? `<img class="part-image" src="${escapeHtml(selectedImageUrl)}" alt="${escapeHtml(selected.name || category.name)}" loading="lazy" />`
      : '<div class="part-image-placeholder">No image</div>';

    html += `
      <div class="part-item ${selected ? 'selected' : ''}">
        <div class="part-main">
          <div class="part-image-field">${imageField}</div>
          <div class="part-info">
            <div class="part-name">${category.name}</div>
            ${selected ? `
              <div class="part-name">${selected.name}</div>
              <div class="part-price">${selected.price.toLocaleString()} VND</div>
            ` : `
              <div class="part-name-placeholder">Add ${category.name}</div>
            `}
          </div>
        </div>
        <div class="part-actions">
          ${selected ? `<button class="btn btn-sm btn-outline-danger me-2" onclick="removeComponent('${category.key}')">Remove</button>` : ''}
          <button class="btn btn-sm btn-outline-primary" onclick="showComponentSelector('${category.key}')">${selected ? 'Change' : '+ Add'} ${category.name}</button>
        </div>
      </div>
    `;
  });

  partsList.innerHTML = html;
  updateBuildVisualizer();
}

async function showComponentSelector(categoryKey, page = null) {
  const category = partsCategories.find(c => c.key === categoryKey);
  if (!category) return;

  const categoryName = category.name;
  closeComponentSelector();

  // Show loading modal first
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade show" id="componentModal" style="display:block" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Select ${categoryName}</h5>
            <button type="button" class="btn-close" onclick="closeComponentSelector()"></button>
          </div>
          <div class="modal-body text-center py-4">
            <div class="spinner-border" role="status"></div>
            <p class="mt-2 mb-0">Loading components…</p>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show"></div>
  `);

  const requestedPage = page === null ? getSelectorPage(categoryKey) : Math.max(1, Number(page) || 1);

  let result;
  try {
    result = await fetchComponentsByCategory(categoryKey, requestedPage);
  } catch (err) {
    closeComponentSelector();
    showPopup('Cannot load components. Is the server running?');
    return;
  }

  closeComponentSelector();

  const { items: pageItems, total: totalItems, page: currentPage, pages: totalPages } = result;
  setSelectorPage(categoryKey, currentPage);
  // Store current page items so selectComponent() can look them up by relative index
  selectorPageItems[categoryKey] = pageItems;

  const startIndex = (currentPage - 1) * selectorState.pageSize;
  const endIndex = startIndex + pageItems.length;

  let html = `<div class="modal fade show" id="componentModal" style="display:block" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Select ${categoryName}</h5>
          <button type="button" class="btn-close" onclick="closeComponentSelector()"></button>
        </div>
        <div class="modal-body">
          <div class="row">`;

  if (pageItems.length === 0) {
    html += `
      <div class="col-12">
        <p class="text-muted mb-0">No components available in this category.</p>
      </div>
    `;
  }

  pageItems.forEach((component, index) => {
    html += `
      <div class="col-md-6 mb-3">
        <div class="card">
          <div class="card-body">
            <h6 class="card-title">${component.name}</h6>
            <p class="card-text text-muted mb-1" style="font-size:12px">${component.brand || ''}</p>
            <p class="card-text"><strong>${Number(component.price).toLocaleString()} VND</strong></p>
            <p class="card-text" style="font-size:12px;color:#666">Power: ${component.power || 0}W &nbsp;|&nbsp; Stock: ${component.stock || 0}</p>
            <button class="btn btn-sm btn-primary" onclick="selectComponent('${categoryKey}', ${index})">Select</button>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';

  if (totalItems > 0) {
    html += `<p class="selector-summary">Showing ${startIndex + 1}–${endIndex} of ${totalItems} component(s)</p>`;
  }

  html += buildSelectorPagination(categoryKey, currentPage, totalPages);
  html += `</div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeComponentSelector()">Close</button></div></div></div></div><div class="modal-backdrop fade show"></div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

function closeComponentSelector() {
  const modal = document.getElementById('componentModal');
  if (modal) {
    modal.remove();
  }
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.remove();
  }
}

async function selectComponent(categoryKey, index) {
  const items = selectorPageItems[categoryKey] || [];
  const component = items[index];
  if (!component) return;
  currentBuild[categoryKey] = {
    _id: component._id,
    category: component.category || categoryKey,
    name: component.name,
    price: component.price,
    power: component.power || 0,
    brand: component.brand || '',
    imageUrl: component.imageUrl || '',
  };
  closeComponentSelector();
  renderPartsList();
  updateStats();
  await persistCurrentBuild();
}

async function removeComponent(categoryKey) {
  currentBuild[categoryKey] = null;
  renderPartsList();
  updateStats();
  await persistCurrentBuild();
}

async function persistCurrentBuild() {
  try {
    await saveBuild(currentBuild);
  } catch (error) {
    showPopup(error.message || 'Cannot sync build right now.');
  }
}

// Realtime API for the AI chatbot widget — adds a component directly to currentBuild
window.chatbotAddComponent = async function(component) {
  if (!component || !component.category) return false;
  currentBuild[component.category] = {
    _id:      component._id,
    category: component.category,
    name:     component.name,
    price:    component.price,
    power:    component.power || 0,
    brand:    component.brand || '',
    imageUrl: component.imageUrl || '',
  };
  renderPartsList();
  updateStats();
  await persistCurrentBuild();
  return true;
};

async function saveCurrentBuild() {
  if (!window.isLoggedIn) {
    // show centered popup with delay and click-action
    let autoId;
    const clickHandler = () => {
      clearTimeout(autoId);
      toggleAuthPopup(new Event('click'));
    };
    showPopup('Please log in to save your build. Click to proceed.', {
      duration: 5000,
      center: true,
      onClick: clickHandler
    });
    // also schedule automatic open after delay
    autoId = setTimeout(() => {
      if (!window.isLoggedIn) toggleAuthPopup(new Event('click'));
    }, 5000);
    return;
  }

  try {
    const buildName = document.getElementById('buildName')?.textContent || 'New Build';
    await saveBuildName(buildName);
    await saveBuild(currentBuild);
    showPopup('Build saved to your account');
  } catch (error) {
    showPopup(error.message || 'Cannot save build right now.');
  }
}

function applyCompatibilityStatus(compatible, totalPrice, score = null, source = 'local') {
  const compatibilityEl = document.getElementById('compatibility');
  if (!compatibilityEl) return;

  if (source === 'ai' && Number.isFinite(score)) {
    compatibilityEl.textContent = compatible
      ? `AI ✓ Compatible (${Math.round(score)}%)`
      : `AI ✗ Incompatible (${Math.round(score)}%)`;
  } else {
    compatibilityEl.textContent = compatible ? '✓ Compatible' : '✗ Incompatible';
  }

  compatibilityEl.className = compatible ? 'stat-value compatible' : 'stat-value incompatible';

  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.disabled = !compatible || totalPrice === 0;
  }
}

function renderCompatibilityWarnings(analysis, fallbackWarnings = []) {
  const warningsEl = document.getElementById('compatibilityWarnings');
  if (!warningsEl) return;

  const aiChecks = Array.isArray(analysis?.checks)
    ? analysis.checks.filter(check => check.status === 'fail' || check.status === 'warn')
    : [];

  if (aiChecks.length > 0) {
    warningsEl.innerHTML = `
      <h6>AI Analysis</h6>
      <p class="compatibility-summary">${escapeHtml(analysis.summary || '')}</p>
      <ul class="compatibility-checks">
        ${aiChecks
          .map(check => `<li class="compatibility-check ${check.status}"><strong>${escapeHtml(check.title)}:</strong> ${escapeHtml(check.detail)}</li>`)
          .join('')}
      </ul>
    `;
    warningsEl.style.display = 'block';
    return;
  }

  if (fallbackWarnings.length > 0) {
    warningsEl.innerHTML = '<h6>Warnings:</h6><ul>' + fallbackWarnings.map(w => `<li>${escapeHtml(w)}</li>`).join('') + '</ul>';
    warningsEl.style.display = 'block';
    return;
  }

  warningsEl.style.display = 'none';
}

async function runCompatibilityAnalysis(totalPrice, fallbackPowerDraw, fallbackWarnings) {
  const currentRequestId = ++compatibilityState.requestId;
  const normalizedParts = {};

  Object.entries(currentBuild).forEach(([categoryKey, part]) => {
    if (!part) {
      normalizedParts[categoryKey] = null;
      return;
    }

    normalizedParts[categoryKey] = {
      ...part,
      category: part.category || categoryKey,
    };
  });

  try {
    const response = await fetch(`${COMPATIBILITY_API_BASE_URL}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parts: normalizedParts }),
    });

    const analysis = await response.json();
    if (!response.ok) {
      throw new Error(analysis?.message || 'Failed to analyze compatibility');
    }

    if (currentRequestId !== compatibilityState.requestId) {
      return;
    }

    const powerDrawEl = document.getElementById('powerDraw');
    if (powerDrawEl) {
      const serverPowerDraw = Number(analysis.totalPowerDrawW);
      powerDrawEl.textContent = `${Number.isFinite(serverPowerDraw) ? serverPowerDraw : fallbackPowerDraw}W`;
    }

    applyCompatibilityStatus(Boolean(analysis.compatible), totalPrice, Number(analysis.score), 'ai');
    renderCompatibilityWarnings(analysis, fallbackWarnings);
  } catch (error) {
    if (currentRequestId !== compatibilityState.requestId) {
      return;
    }

    console.warn('AI compatibility check fallback to local rules:', error.message);
    applyCompatibilityStatus(fallbackWarnings.length === 0, totalPrice);
    renderCompatibilityWarnings(null, fallbackWarnings);
  }
}

function scheduleCompatibilityAnalysis(totalPrice, fallbackPowerDraw, fallbackWarnings) {
  if (compatibilityState.debounceTimer) {
    clearTimeout(compatibilityState.debounceTimer);
  }

  compatibilityState.debounceTimer = setTimeout(() => {
    runCompatibilityAnalysis(totalPrice, fallbackPowerDraw, fallbackWarnings);
  }, 220);
}

function updateStats() {
  let totalPrice = 0;
  let totalPower = 0;
  let compatible = true;
  let warnings = [];

  Object.entries(currentBuild).forEach(([key, component]) => {
    if (component) {
      totalPrice += component.price;
      // exclude PSU wattage from power draw
      if (key !== 'psu') {
        totalPower += component.power || 0;
      }
    }
  });

  // Check PSU compatibility
  if (currentBuild.psu && totalPower > currentBuild.psu.power) {
    compatible = false;
    warnings.push('Power supply wattage is insufficient');
  }

  // Check essential components (PSU still required but not counted in power draw)
  const essentials = ['case', 'cpu', 'motherboard', 'ram', 'storage', 'psu'];
  essentials.forEach(key => {
    if (!currentBuild[key]) {
      compatible = false;
      warnings.push(`${partsCategories.find(c => c.key === key).name} is required`);
    }
  });

  document.getElementById('totalPrice').textContent = totalPrice.toLocaleString() + ' VND';
  document.getElementById('powerDraw').textContent = totalPower + 'W';

  applyCompatibilityStatus(compatible, totalPrice);
  renderCompatibilityWarnings(null, warnings);
  scheduleCompatibilityAnalysis(totalPrice, totalPower, warnings);
}

function editBuildName() {
  const buildNameEl = document.getElementById('buildName');
  const currentName = buildNameEl.textContent;
  
  // Create input field
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'form-control d-inline-block';
  input.style.width = '200px';
  input.style.fontSize = '24px';
  input.style.fontWeight = 'bold';
  
  // Replace h2 with input
  buildNameEl.parentNode.replaceChild(input, buildNameEl);
  input.focus();
  input.select();
  
  // Handle save on Enter or blur
  const saveName = () => {
    const newName = input.value.trim() || 'New Build';
    
    // Replace input back with h2
    const newH2 = document.createElement('h2');
    newH2.id = 'buildName';
    newH2.textContent = newName;
    input.parentNode.replaceChild(newH2, input);
    
    // Save to database (placeholder for future API call)
    saveBuildName(newName).catch(() => {
      showPopup('Cannot update build name right now.');
    });
  };
  
  input.addEventListener('blur', saveName);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveName();
    } else if (e.key === 'Escape') {
      // Cancel edit
      const cancelH2 = document.createElement('h2');
      cancelH2.id = 'buildName';
      cancelH2.textContent = currentName;
      input.parentNode.replaceChild(cancelH2, input);
    }
  });
}

async function loadBuildFromApiState() {
  if (window.awaitCommerceStateReady) {
    await window.awaitCommerceStateReady();
  }

  currentBuild = getBuild();
}

async function loadBuildNameFromApiState() {
  if (window.awaitCommerceStateReady) {
    await window.awaitCommerceStateReady();
  }

  const savedName = getBuildName();
  if (savedName) {
    document.getElementById('buildName').textContent = savedName;
  }
}

async function loadFeaturedPresetIfPresent() {
  try {
    const presetJson = sessionStorage.getItem('featuredBuildPreset');
    if (!presetJson) return false;
    sessionStorage.removeItem('featuredBuildPreset');
    const preset = JSON.parse(presetJson);
    for (const [category, partSpec] of Object.entries(preset.parts)) {
      if (!partSpec) continue;
      try {
        const nameQ = encodeURIComponent(partSpec.name.substring(0, 60));
        const res = await fetch(
          `${COMPONENT_API_BASE_URL}?category=${encodeURIComponent(category)}&q=${nameQ}&limit=5`
        );
        const data = res.ok ? await res.json() : {};
        const candidates = Array.isArray(data) ? data : (data.items || []);
        const matched = candidates.find(c => c.name === partSpec.name)
          || candidates.find(c => c.name.toLowerCase().startsWith(partSpec.name.substring(0, 20).toLowerCase()));
        if (matched) {
          currentBuild[category] = {
            _id: matched._id,
            category: matched.category,
            name: matched.name,
            price: matched.price,
            power: matched.power || 0,
            brand: matched.brand || '',
            imageUrl: matched.imageUrl || '',
          };
        }
      } catch (_) {}
    }
    if (preset.name) {
      const buildNameEl = document.getElementById('buildName');
      if (buildNameEl) buildNameEl.textContent = preset.name;
      saveBuildName(preset.name).catch(() => {});
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function initializeDashboardState() {
  const presetLoaded = await loadFeaturedPresetIfPresent();
  if (!presetLoaded) {
    await loadBuildFromApiState();
    await loadBuildNameFromApiState();
  }
  renderPartsList();
  updateStats();
}

initializeDashboardState().catch(error => {
  console.error('Failed to initialize dashboard state:', error);
  renderPartsList();
  updateStats();
});

// set header-date to real current date
function updateHeaderDate() {
  const dateEl = document.querySelector('.header-date');
  if (!dateEl) return;
  const opts = { year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = new Date().toLocaleDateString(undefined, opts);
}
updateHeaderDate();

// --- checkout support ------------------------------------------------
function handleCheckout() {
  const totalText = document.getElementById('totalPrice').textContent || '0';
  const total = parseInt(totalText.replace(/[^0-9]/g, ''), 10);
  const compatibleEl = document.getElementById('compatibility');
  const isCompatible = compatibleEl && compatibleEl.classList.contains('compatible');

  if (!isCompatible) {
    showPopup('Build is not compatible; please resolve warnings before checking out.');
    return;
  }
  if (total === 0) {
    showPopup('Your build is empty. Add parts before proceeding to payment.');
    return;
  }

  // redirect to shopping-cart.html with build components transferred as cart items
  redirectToShoppingCartWithBuild();
}

function redirectToShoppingCartWithBuild() {
  try {
    // Get the current build components
    const buildComponents = currentBuild;
    
    // Convert non-null components into cart-compatible items
    const cartItems = Object.values(buildComponents)
      .filter(component => component !== null && component !== undefined)
      .map(component => ({
        _id: component._id || '',
        category: component.category || '',
        name: component.name || '',
        brand: component.brand || '',
        price: Number(component.price || 0),
        power: Number(component.power || 0),
        quantity: 1
      }))
      .filter(item => item._id && item.name);

    if (cartItems.length === 0) {
      showPopup('No components in your build to add to cart.');
      return;
    }

    // Store build components in sessionStorage for shopping-cart to load
    sessionStorage.setItem('buildCheckoutItems', JSON.stringify(cartItems));
    
    // Redirect to shopping cart page
    window.location.href = 'shopping-cart.html';
  } catch (error) {
    console.error('Error redirecting to shopping cart:', error);
    showPopup('Cannot redirect to shopping cart. Please try again.');
  }
}

function showPaymentModal(amount) {
  const existing = document.getElementById('paymentModal');
  if (existing) {
    closePaymentModal();
    return;
  }
  const backdrop = document.createElement('div');
  backdrop.id = 'paymentBackdrop';
  backdrop.className = 'auth-backdrop';
  backdrop.addEventListener('click', closePaymentModal);

  const modal = document.createElement('div');
  modal.id = 'paymentModal';
  modal.className = 'auth-modal';

  const header = document.createElement('div');
  header.className = 'auth-header';
  const title = document.createElement('h2');
  title.textContent = 'Choose payment method';
  header.appendChild(title);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'auth-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closePaymentModal);
  header.appendChild(closeBtn);

  const content = document.createElement('div');
  content.className = 'auth-content';
  content.innerHTML = `
    <p>Total: ${amount.toLocaleString()} VND</p>
    <button class="btn btn-primary w-100 mb-2" id="payMomo">MoMo</button>
    <button class="btn btn-secondary w-100 mb-2" id="payPaypal">PayPal</button>
  `;

  modal.appendChild(header);
  modal.appendChild(content);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  requestAnimationFrame(() => backdrop.classList.add('show'));

  document.getElementById('payPaypal').addEventListener('click', () => {
    if (!window.isLoggedIn) {
      closePaymentModal();
      toggleAuthPopup(new Event('click'));
      showPopup('Please log in before paying.');
      return;
    }
    showPopup('Redirecting to PayPal...');
    closePaymentModal();
  });

  document.getElementById('payMomo').addEventListener('click', async () => {
    if (!window.isLoggedIn) {
      closePaymentModal();
      toggleAuthPopup(new Event('click'));
      showPopup('Please log in before paying.');
      return;
    }

    const payMomoBtn = document.getElementById('payMomo');
    if (payMomoBtn) {
      payMomoBtn.disabled = true;
      payMomoBtn.textContent = 'Creating payment...';
    }

    try {
      await startMomoPayment(amount);
    } catch (error) {
      if (payMomoBtn) {
        payMomoBtn.disabled = false;
        payMomoBtn.textContent = 'MoMo';
      }
      showPopup(error.message || 'Cannot connect to MoMo API right now.');
    }
  });
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  const backdrop = document.getElementById('paymentBackdrop');
  if (modal) modal.remove();
  if (backdrop) {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 250);
  }
}

async function startMomoPayment(amount) {
  // Always sync currentBuild to the server before creating the checkout order.
  // This covers cases where currentBuild was populated without being persisted
  // (e.g. featured preset load, post-login rehydration).
  await saveBuild(currentBuild);

  const orderPayload = await createCheckoutOrder('build');
  const orderId = orderPayload?.order?.id;
  if (!orderId) {
    throw new Error('Cannot create order for this build');
  }

  const buildName = (typeof getBuildName === 'function' && getBuildName()) || 'New Build';

  const response = await fetch(`${PAYMENT_API_BASE_URL}/momo/create`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      orderId,
      orderInfo: `Payment for build ${buildName}`,
      orderType: 'other',
      language: 'vn',
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.metadata) {
    throw new Error(data.message || 'Cannot create MoMo payment URL');
  }

  window.location.href = data.metadata;
}

document.addEventListener('DOMContentLoaded', () => {
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
    // ensure state matches current stats
    checkoutBtn.disabled = document.getElementById('compatibility')?.classList.contains('compatible') ? false : true;
  }
  const saveBtn = document.getElementById('saveBuildBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveCurrentBuild);
  }
});

// ── Pre-built PC Tab ──────────────────────────────────────────────────────────

const FEATURED_BUILDS_API_URL = 'http://127.0.0.1:3001/api/featured-builds';

let prebuiltLoaded = false;

const TIER_LABELS = { high: 'High-End', mid: 'Mid-Range', budget: 'Budget' };
const TIER_CLASSES = { high: 'tier-high', mid: 'tier-mid', budget: 'tier-budget' };

function switchPartsTab(tab) {
  const prebuiltPanel = document.getElementById('prebuiltPanel');
  const customPanel   = document.getElementById('customPanel');
  const tabPrebuilt   = document.getElementById('tabPrebuilt');
  const tabCustom     = document.getElementById('tabCustom');
  if (!prebuiltPanel || !customPanel) return;

  if (tab === 'prebuilt') {
    prebuiltPanel.style.display = '';
    customPanel.style.display   = 'none';
    tabPrebuilt.classList.add('active');
    tabCustom.classList.remove('active');
    if (!prebuiltLoaded) loadPrebuiltList();
  } else {
    prebuiltPanel.style.display = 'none';
    customPanel.style.display   = '';
    tabPrebuilt.classList.remove('active');
    tabCustom.classList.add('active');
  }
}

async function loadPrebuiltList() {
  const listEl = document.getElementById('prebuiltList');
  if (!listEl) return;

  listEl.innerHTML = '<p class="prebuilt-loading">Loading pre-built PCs…</p>';

  try {
    const res = await fetch(FEATURED_BUILDS_API_URL);
    if (!res.ok) throw new Error('Failed to fetch featured builds');
    const builds = await res.json();
    prebuiltLoaded = true;

    if (!builds.length) {
      listEl.innerHTML = '<p class="prebuilt-empty">No pre-built PCs available.</p>';
      return;
    }

    listEl.innerHTML = builds.map(b => {
      const tier      = b.tier || 'mid';
      const tierLabel = TIER_LABELS[tier] || tier;
      const tierClass = TIER_CLASSES[tier] || 'tier-mid';

      // parts may be a plain object or Map serialized as object
      const partsObj = b.parts && typeof b.parts === 'object' && !Array.isArray(b.parts) ? b.parts : {};
      const partChips = Object.entries(partsObj)
        .filter(([, p]) => p && p.name)
        .map(([cat, p]) => `<span class="prebuilt-part-chip" title="${escapeHtml(cat)}">${escapeHtml(p.name)}</span>`)
        .join('');

      return `
        <div class="prebuilt-card" id="prebuilt-card-${escapeHtml(b.presetId)}">
          <div class="prebuilt-card-header">
            <span class="prebuilt-tier ${escapeHtml(tierClass)}">${escapeHtml(tierLabel)}</span>
            <strong class="prebuilt-name">${escapeHtml(b.name)}</strong>
          </div>
          <p class="prebuilt-tagline">${escapeHtml(b.tagline || '')}</p>
          <div class="prebuilt-price prebuilt-est-price" id="prebuilt-price-${escapeHtml(b.presetId)}">${escapeHtml(b.estimatedPrice || '')}</div>
          <div class="prebuilt-parts-summary" id="prebuilt-parts-${escapeHtml(b.presetId)}">${partChips}</div>
          <div class="prebuilt-card-footer">
            <button class="btn btn-sm btn-primary prebuilt-load-btn"
                    id="prebuilt-btn-${escapeHtml(b.presetId)}"
                    onclick="applyPrebuiltBuild('${escapeHtml(b.presetId)}')">
              Load Build
            </button>
            <span class="prebuilt-missing-note" id="prebuilt-note-${escapeHtml(b.presetId)}" style="display:none"></span>
          </div>
        </div>
      `;
    }).join('');
  } catch {
    listEl.innerHTML = '<p class="prebuilt-empty">Cannot load pre-built PCs. Is the server running?</p>';
  }
}

async function applyPrebuiltBuild(presetId) {
  const btn  = document.getElementById(`prebuilt-btn-${presetId}`);
  const note = document.getElementById(`prebuilt-note-${presetId}`);
  const priceEl = document.getElementById(`prebuilt-price-${presetId}`);
  const partsEl = document.getElementById(`prebuilt-parts-${presetId}`);

  if (btn) { btn.disabled = true; btn.textContent = 'Resolving parts…'; }
  if (note) { note.style.display = 'none'; }

  try {
    // Single request: backend resolves all 9 parts in ONE MongoDB $or query
    const res = await fetch(`${FEATURED_BUILDS_API_URL}/${encodeURIComponent(presetId)}/resolve`);
    if (!res.ok) throw new Error('Preset not found');
    const { preset, resolved, missing } = await res.json();

    // Apply resolved components to currentBuild
    const newBuild = {
      case: null, cpu: null, motherboard: null, gpu: null,
      ram: null, cooler: null, storage: null, psu: null, fan: null,
    };
    let actualPrice = 0;

    for (const [category, comp] of Object.entries(resolved)) {
      newBuild[category] = {
        _id:      comp._id,
        category: comp.category,
        name:     comp.name,
        price:    comp.price,
        power:    comp.power || 0,
        brand:    comp.brand || '',
        imageUrl: comp.imageUrl || '',
      };
      actualPrice += Number(comp.price || 0);
    }

    Object.assign(currentBuild, newBuild);

    if (preset.name) {
      const buildNameEl = document.getElementById('buildName');
      if (buildNameEl) buildNameEl.textContent = preset.name;
      saveBuildName(preset.name).catch(() => {});
    }

    renderPartsList();
    updateStats();
    await persistCurrentBuild();

    // Update card to show resolved state
    if (priceEl && actualPrice > 0) {
      priceEl.textContent = actualPrice.toLocaleString('vi-VN') + ' ₫';
      priceEl.classList.remove('prebuilt-est-price');
    }
    if (partsEl) {
      // Re-render chips with ✓ found / ✗ missing coloring
      const CAT_ORDER = ['case','cpu','motherboard','gpu','ram','cooler','storage','psu','fan'];
      const CAT_LABELS_SHORT = { case:'Case', cpu:'CPU', motherboard:'MB', gpu:'GPU', ram:'RAM', cooler:'Cooler', storage:'SSD', psu:'PSU', fan:'Fan' };
      partsEl.innerHTML = CAT_ORDER.map(cat => {
        const comp = resolved[cat];
        if (comp) {
          return `<span class="prebuilt-part-chip chip-found" title="${escapeHtml(comp.name)}">✓ ${escapeHtml(comp.name)}</span>`;
        }
        if (missing.includes(cat)) {
          return `<span class="prebuilt-part-chip chip-missing" title="Not in catalog">✗ ${escapeHtml(CAT_LABELS_SHORT[cat] || cat)}</span>`;
        }
        return '';
      }).join('');
    }

    switchPartsTab('custom');

    if (missing.length) {
      if (note) {
        note.style.display = '';
        note.textContent = `⚠ ${missing.length} part(s) not in catalog: ${missing.join(', ')}`;
      }
      showPopup(`"${preset.name}" loaded — ${missing.length} part(s) not found in catalog.`);
    } else {
      showPopup(`"${preset.name}" loaded successfully (${Object.keys(resolved).length}/9 parts)!`);
    }

    if (btn) { btn.textContent = '✓ Loaded'; btn.classList.replace('btn-primary', 'btn-success'); }
  } catch {
    showPopup('Cannot load this pre-built PC. Please try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Load Build'; }
  }
}
