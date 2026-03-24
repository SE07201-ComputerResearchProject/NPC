// Components popup menu
function toggleComponentsMenu(event) {
  event.preventDefault();
  const existing = document.getElementById('componentsMenu');
  if (existing) {
    existing.remove();
    const backdrop = document.querySelector('.components-backdrop');
    if (backdrop) backdrop.remove();
    return;
  }

  const categories = [
    { key: 'case', label: 'Case', icon: 'pc-case' },
    { key: 'cpu', label: 'CPU', icon: 'cpu' },
    { key: 'motherboard', label: 'Motherboard', icon: 'server' },
    { key: 'gpu', label: 'GPU', icon: 'gpu' },
    { key: 'ram', label: 'RAM', icon: 'memory-stick' },
    { key: 'storage', label: 'Storage', icon: 'hard-drive' },
    { key: 'psu', label: 'Power Supply', icon: 'zap' },
    { key: 'cooler', label: 'Cooler', icon: 'thermometer' },
    { key: 'fan', label: 'Case Fan', icon: 'wind' }
  ];

  const floatingMenu = document.querySelector('.floating-menu');
  let html = '<div class="components-menu" id="componentsMenu">';
  categories.forEach(cat => {
    html += `<a href=\"products.html?category=${cat.key}\" class=\"components-item\">` +
            `<i data-lucide=\"${cat.icon}\"></i><span>${cat.label}</span></a>`;
  });
  html += '</div>';

  document.body.insertAdjacentHTML('beforeend', html);
  const menuEl = document.getElementById('componentsMenu');
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // position popup above the clicked icon rather than the whole bar
  if (menuEl) {
    const trigger = event.currentTarget;
    const rect = trigger.getBoundingClientRect();
    // use fixed positioning so it stays tied to viewport
    menuEl.style.position = 'fixed';
    // compute centred x then clamp to viewport edges
    let left = rect.left + rect.width/2 - menuEl.offsetWidth/2;
    left = Math.max(8, Math.min(left, window.innerWidth - menuEl.offsetWidth - 8));
    menuEl.style.left = left + 'px';
    // position above the trigger and avoid going off the top
    let top = rect.top - menuEl.offsetHeight - 8;
    top = Math.max(8, top);
    menuEl.style.top = top + 'px';
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'components-backdrop';
  backdrop.addEventListener('click', toggleComponentsMenu);
  document.body.appendChild(backdrop);
}
