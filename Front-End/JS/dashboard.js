// Dashboard functionality for PC Builder

const PAYMENT_API_BASE_URL = 'http://localhost:3000/api/payments';
const COMPATIBILITY_API_BASE_URL = 'http://localhost:3000/api/compatibility';

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

const COMPONENT_API_BASE_URL = 'http://localhost:3000/api/components';
const componentsCache = {};
const compatibilityState = {
  requestId: 0,
  debounceTimer: null,
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchComponentsByCategory(categoryKey) {
  if (componentsCache[categoryKey]) return componentsCache[categoryKey];
  const res = await fetch(`${COMPONENT_API_BASE_URL}?category=${categoryKey}`);
  if (!res.ok) throw new Error('Failed to load components');
  const data = await res.json();
  componentsCache[categoryKey] = data;
  return data;
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

    html += `
      <div class="part-item ${selected ? 'selected' : ''}">
        <div class="part-info">
          <div class="part-name">${category.name}</div>
          ${selected ? `
            <div class="part-name">${selected.name}</div>
            <div class="part-price">${selected.price.toLocaleString()} VND</div>
          ` : `
            <div class="part-name-placeholder">Add ${category.name}</div>
          `}
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

  let categoryComponents;
  try {
    categoryComponents = await fetchComponentsByCategory(categoryKey);
  } catch (err) {
    closeComponentSelector();
    showPopup('Cannot load components. Is the server running?');
    return;
  }

  closeComponentSelector();

  const totalItems = categoryComponents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / selectorState.pageSize));
  const requestedPage = page === null ? getSelectorPage(categoryKey) : page;
  const currentPage = Math.min(Math.max(1, Number(requestedPage) || 1), totalPages);

  setSelectorPage(categoryKey, currentPage);

  const startIndex = (currentPage - 1) * selectorState.pageSize;
  const endIndex = Math.min(startIndex + selectorState.pageSize, totalItems);
  const pageItems = categoryComponents.slice(startIndex, endIndex);

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
    const absoluteIndex = startIndex + index;
    html += `
      <div class="col-md-6 mb-3">
        <div class="card">
          <div class="card-body">
            <h6 class="card-title">${component.name}</h6>
            <p class="card-text text-muted mb-1" style="font-size:12px">${component.brand || ''}</p>
            <p class="card-text"><strong>${Number(component.price).toLocaleString()} VND</strong></p>
            <p class="card-text" style="font-size:12px;color:#666">Power: ${component.power || 0}W &nbsp;|&nbsp; Stock: ${component.stock || 0}</p>
            <button class="btn btn-sm btn-primary" onclick="selectComponent('${categoryKey}', ${absoluteIndex})">Select</button>
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
  const items = componentsCache[categoryKey] || [];
  const component = items[index];
  if (!component) return;
  currentBuild[categoryKey] = {
    _id: component._id,
    category: component.category || categoryKey,
    name: component.name,
    price: component.price,
    power: component.power || 0,
    brand: component.brand || '',
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
        const components = await fetchComponentsByCategory(category);
        const matched = components.find(c => c.name === partSpec.name)
          || components.find(c => c.name.toLowerCase().startsWith(partSpec.name.substring(0, 20).toLowerCase()));
        if (matched) {
          currentBuild[category] = {
            _id: matched._id,
            category: matched.category,
            name: matched.name,
            price: matched.price,
            power: matched.power || 0,
            brand: matched.brand || '',
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

// --- payment/checkout support ------------------------------------------------
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

  // show payment options modal (login check occurs when selecting a method)
  showPaymentModal(total);
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
    <button class="btn btn-primary w-100 mb-2" id="payCard">Credit/Debit Card</button>
    <button class="btn btn-secondary w-100 mb-2" id="payPaypal">PayPal</button>
    <button class="btn btn-danger w-100 mb-2" id="payMomo">MoMo</button>
  `;

  modal.appendChild(header);
  modal.appendChild(content);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  requestAnimationFrame(() => backdrop.classList.add('show'));

  document.getElementById('payCard').addEventListener('click', () => {
    if (!window.isLoggedIn) {
      closePaymentModal();
      toggleAuthPopup(new Event('click'));
      showPopup('Please log in before paying.');
      return;
    }
    showPopup('Processing card payment...');
    closePaymentModal();
  });
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

function notifyPaymentResultFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get('paymentStatus');
  if (!paymentStatus) {
    return;
  }

  const paymentCode = params.get('paymentCode') || 'N/A';
  if (paymentStatus === 'success') {
    showPopup(`MoMo payment successful (code: ${paymentCode})`, { duration: 3500, center: true });
  } else {
    showPopup(`MoMo payment failed (code: ${paymentCode})`, { duration: 3500, center: true });
  }

  window.history.replaceState({}, '', window.location.pathname);
}

async function startMomoPayment(amount) {
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
  if (!response.ok || !data.paymentUrl) {
    throw new Error(data.message || 'Cannot create MoMo payment URL');
  }

  window.location.href = data.paymentUrl;
}

document.addEventListener('DOMContentLoaded', () => {
  notifyPaymentResultFromUrl();

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
