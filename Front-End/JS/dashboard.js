// Dashboard functionality for PC Builder

const partsCategories = [
  { key: 'case', name: 'Case', power: 0 },
  { key: 'cpu', name: 'CPU', power: 65 },
  { key: 'motherboard', name: 'Motherboard', power: 0 },
  { key: 'gpu', name: 'GPU', power: 250 },
  { key: 'ram', name: 'RAM', power: 3 },
  { key: 'cooler', name: 'CPU Cooler', power: 0 },
  { key: 'storage', name: 'Storage', power: 5 },
  { key: 'psu', name: 'Power Supply', power: 0 },
  { key: 'fan', name: 'Case Fan', power: 0 },
  { key: 'monitor', name: 'Monitor', power: 50 },
  { key: 'mouse', name: 'Mouse', power: 1 },
  { key: 'keyboard', name: 'Keyboard', power: 2 },
  { key: 'speaker', name: 'Speaker', power: 10 },
  { key: 'headphones', name: 'Headphones', power: 1 },
  { key: 'microphone', name: 'Microphone', power: 0 },
  { key: 'webcam', name: 'Webcam', power: 2 }
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
  fan: null,
  monitor: null,
  mouse: null,
  keyboard: null,
  speaker: null,
  headphones: null,
  microphone: null,
  webcam: null
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
  ],
  monitor: [
    { name: '27\" 144Hz IPS Panel', price: 3000000, power: 40 },
    { name: '32\" 4K 144Hz', price: 6000000, power: 60 }
  ],
  mouse: [
    { name: 'Logitech G Pro X', price: 1200000, power: 1 },
    { name: 'Razer DeathAdder V3', price: 1500000, power: 1 }
  ],
  keyboard: [
    { name: 'Corsair K95 Platinum', price: 2000000, power: 2 },
    { name: 'ASUS ROG Claymore II', price: 1800000, power: 2 }
  ],
  speaker: [
    { name: 'Corsair SP2500', price: 1500000, power: 25 },
    { name: 'Razer Leviathan', price: 2000000, power: 15 }
  ],
  headphones: [
    { name: 'SteelSeries Arctis Pro', price: 1500000, power: 1 },
    { name: 'Corsair VOID RGB', price: 900000, power: 1 }
  ],
  microphone: [
    { name: 'Blue Yeti X', price: 1200000, power: 3 },
    { name: 'Audio-Technica AT4040', price: 2500000, power: 2 }
  ],
  webcam: [
    { name: 'Logitech C920 Pro', price: 800000, power: 2 },
    { name: 'Razer Kiyo Pro', price: 1200000, power: 3 }
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
          <button class="btn btn-sm btn-outline-primary" onclick="showComponentSelector('${category.key}')">+ Add ${category.name}</button>
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
}

function updateStats() {
  let totalPrice = 0;
  let totalPower = 0;

  Object.values(currentBuild).forEach(component => {
    if (component) {
      totalPrice += component.price;
      totalPower += component.power || 0;
    }
  });

  document.getElementById('totalPrice').textContent = totalPrice.toLocaleString() + ' VND';
  document.getElementById('powerDraw').textContent = totalPower + 'W';
}

// Initialize
renderPartsList();
updateStats();