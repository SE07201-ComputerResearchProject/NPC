// Components popup menu — shows on hover, navigates to products.html on click
(function () {
  let hideTimer = null;

  const categories = [
    { key: 'case', label: 'Case', icon: 'pc-case' },
    { key: 'cpu', label: 'CPU', icon: 'cpu' },
    { key: 'motherboard', label: 'Motherboard', icon: 'server' },
    { key: 'gpu', label: 'GPU', icon: 'gpu' },
    { key: 'ram', label: 'RAM', icon: 'memory-stick' },
    { key: 'storage', label: 'Storage', icon: 'hard-drive' },
    { key: 'psu', label: 'Power Supply', icon: 'zap' },
    { key: 'cooler', label: 'Cooler', icon: 'thermometer' },
    { key: 'fan', label: 'Case Fan', icon: 'wind' },
  ];

  function buildMenu() {
    if (document.getElementById('componentsMenu')) return;

    let html = '<div class="components-menu" id="componentsMenu">';
    categories.forEach(cat => {
      html += `<a href="products.html?category=${cat.key}" class="components-item">` +
              `<i data-lucide="${cat.icon}"></i><span>${cat.label}</span></a>`;
    });
    html += '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
    const menuEl = document.getElementById('componentsMenu');

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Keep menu open while hovering over it
    menuEl.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    menuEl.addEventListener('mouseleave', scheduleHide);
  }

  function positionMenu(trigger) {
    const menuEl = document.getElementById('componentsMenu');
    if (!menuEl) return;

    const rect = trigger.getBoundingClientRect();
    menuEl.style.position = 'fixed';

    let left = rect.left + rect.width / 2 - menuEl.offsetWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - menuEl.offsetWidth - 8));
    menuEl.style.left = left + 'px';

    let top = rect.top - menuEl.offsetHeight - 8;
    top = Math.max(8, top);
    menuEl.style.top = top + 'px';
  }

  function showMenu(trigger) {
    clearTimeout(hideTimer);
    buildMenu();
    positionMenu(trigger);
  }

  function scheduleHide() {
    hideTimer = setTimeout(() => {
      const menuEl = document.getElementById('componentsMenu');
      if (menuEl) menuEl.remove();
    }, 150);
  }

  function init() {
    const trigger = document.getElementById('componentsMenuTrigger');
    if (!trigger) return;

    trigger.addEventListener('mouseenter', () => showMenu(trigger));
    trigger.addEventListener('mouseleave', scheduleHide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
