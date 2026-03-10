// Dashboard functionality for PC Builder

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

const components = {
  cpu: [
    { name: 'Intel Core i5-12600K', price: 2500000, power: 125 },
    { name: 'AMD Ryzen 5 5600X', price: 2200000, power: 105 },
    { name: 'Intel Core i7-12700K', price: 3500000, power: 190 }
  ],
  gpu: [
    { name: 'NVIDIA RTX 3060', price: 8000000, power: 170 },
    { name: 'AMD RX 6700 XT', price: 7500000, power: 250 },
    { name: 'NVIDIA RTX 3070', price: 10000000, power: 220 }
  ],
  ram: [
    { name: 'Corsair Vengeance 16GB DDR4', price: 800000, power: 3 },
    { name: 'G.Skill Ripjaws 32GB DDR4', price: 1500000, power: 6 }
  ],
  motherboard: [
    { name: 'ASUS ROG Strix B550-F', price: 3000000, power: 25 },
    { name: 'MSI MAG B660 Tomahawk', price: 2500000, power: 25 }
  ],
  storage: [
    { name: 'Samsung 970 EVO 1TB NVMe', price: 1500000, power: 5 },
    { name: 'WD Blue 2TB HDD', price: 800000, power: 8 }
  ],
  psu: [
    { name: 'Corsair RM750x', price: 2000000, power: 750 },
    { name: 'EVGA SuperNOVA 650', price: 1500000, power: 650 }
  ],
  case: [
    { name: 'Fractal Design Meshify C', price: 1500000, power: 0 },
    { name: 'Corsair 4000D Airflow', price: 1200000, power: 0 }
  ],
  cooler: [
    { name: 'Noctua NH-D15', price: 1500000, power: 10 },
    { name: 'Corsair H100i Elite Capellix', price: 2000000, power: 20 }
  ],
  fan: [
    { name: 'Corsair ML120 Pro', price: 400000, power: 2 },
    { name: 'Noctua NF-F12', price: 350000, power: 2 }
  ]
};

function renderPartsList() {
  const partsList = document.getElementById('partsList');
  let html = '';

  partsCategories.forEach(category => {
    const selected = currentBuild[category.key];
    const categoryComponents = components[category.key];

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
}

function showComponentSelector(categoryKey) {
  const categoryName = partsCategories.find(c => c.key === categoryKey).name;
  const categoryComponents = components[categoryKey];

  let html = `<div class="modal fade show" id="componentModal" style="display:block" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Select ${categoryName}</h5>
          <button type="button" class="btn-close" onclick="closeComponentSelector()"></button>
        </div>
        <div class="modal-body">
          <div class="row">`;

  categoryComponents.forEach((component, index) => {
    html += `
      <div class="col-md-6 mb-3">
        <div class="card">
          <div class="card-body">
            <h6 class="card-title">${component.name}</h6>
            <p class="card-text"><strong>${component.price.toLocaleString()} VND</strong></p>
            <p class="card-text" style="font-size: 12px; color: #666;">Power: ${component.power}W</p>
            <button class="btn btn-sm btn-primary" onclick="selectComponent('${categoryKey}', ${index})">Select</button>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeComponentSelector()">Close</button></div></div></div></div><div class="modal-backdrop fade show"></div>`;

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

function selectComponent(categoryKey, index) {
  currentBuild[categoryKey] = components[categoryKey][index];
  closeComponentSelector();
  renderPartsList();
  updateStats();
  saveBuildToLocalStorage();
}

function removeComponent(categoryKey) {
  currentBuild[categoryKey] = null;
  renderPartsList();
  updateStats();
  saveBuildToLocalStorage();
}

function saveBuildToLocalStorage() {
  // keep localStorage for now; move to server/db in future
  saveBuild(currentBuild);
}

function saveCurrentBuild() {
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
  const profile = getProfile();
  profile.savedBuild = currentBuild;
  saveProfile(profile);
  showPopup('Build saved to your account');
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
  document.getElementById('compatibility').textContent = compatible ? '✓ Compatible' : '✗ Incompatible';
  document.getElementById('compatibility').className = compatible ? 'stat-value compatible' : 'stat-value incompatible';

  // enable/disable checkout button based on compatibility and presence of parts
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.disabled = !compatible || totalPrice === 0;
  }

  // Show warnings
  const warningsEl = document.getElementById('compatibilityWarnings');
  if (warnings.length > 0) {
    warningsEl.innerHTML = '<h6>Warnings:</h6><ul>' + warnings.map(w => `<li>${w}</li>`).join('') + '</ul>';
    warningsEl.style.display = 'block';
  } else {
    warningsEl.style.display = 'none';
  }
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
    saveBuildName(newName);
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

function saveBuildNameToDatabase(name) {
  // TODO: Replace with actual API call to save build name to database
  console.log('Saving build name to database:', name);
  
  // Placeholder: In production, this would be an API call
  // fetch('/api/builds/name', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ name: name })
  // })
  // .then(response => response.json())
  // .then(data => console.log('Build name saved:', data))
  // .catch(error => console.error('Error saving build name:', error));
  
  // Temporary: still use helper which itself currently wraps localStorage
  saveBuildName(name);
}

function loadBuildFromLocalStorage() {
  const saved = getBuild();
  if (saved) {
    currentBuild = saved;
  }
}

function loadBuildNameFromDatabase() {
  // TODO: Replace with actual API call to load build name from database
  console.log('Loading build name from database');
  
  // Placeholder: In production, this would be an API call
  // fetch('/api/builds/name')
  // .then(response => response.json())
  // .then(data => {
  //   if (data.name) {
  //     document.getElementById('buildName').textContent = data.name;
  //   }
  // })
  // .catch(error => console.error('Error loading build name:', error));
  
  // Temporary: still use helper which itself currently wraps localStorage
  const savedName = getBuildName();
  if (savedName) {
    document.getElementById('buildName').textContent = savedName;
  }
}

// Initialize
loadBuildFromLocalStorage();
loadBuildNameFromDatabase();
renderPartsList();
updateStats();

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
