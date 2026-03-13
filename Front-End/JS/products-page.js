const COMPONENT_API_BASE_URL = 'http://localhost:3000/api/components';

const CATEGORY_LABELS = {
  all: 'All Components',
  case: 'Case',
  cpu: 'CPU',
  motherboard: 'Motherboard',
  gpu: 'GPU',
  ram: 'RAM',
  storage: 'Storage',
  psu: 'Power Supply',
  cooler: 'Cooler',
  fan: 'Case Fan',
};

const productsState = {
  categories: [],
  components: [],
  activeCategory: new URLSearchParams(window.location.search).get('category') || 'all',
  searchText: '',
};

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString()} VND`;
}

function updateProductsTitle() {
  const title = document.getElementById('productsTitle');
  if (!title) return;
  title.textContent = CATEGORY_LABELS[productsState.activeCategory] || 'Browse Components';
}

function renderCategoryFilters() {
  const filtersEl = document.getElementById('categoryFilters');
  if (!filtersEl) return;

  const allFilter = { key: 'all', total: productsState.categories.reduce((sum, category) => sum + category.total, 0) };
  const allCategories = [allFilter, ...productsState.categories];

  filtersEl.innerHTML = allCategories.map(category => `
    <button
      type="button"
      class="filter-chip ${category.key === productsState.activeCategory ? 'active' : ''}"
      data-category="${category.key}"
    >
      <span>${CATEGORY_LABELS[category.key] || category.key}</span>
      <strong>${category.total}</strong>
    </button>
  `).join('');

  filtersEl.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      const { category } = button.dataset;
      productsState.activeCategory = category;
      const nextUrl = category === 'all' ? 'products.html' : `products.html?category=${category}`;
      window.history.replaceState({}, '', nextUrl);
      updateProductsTitle();
      renderCategoryFilters();
      loadComponents();
    });
  });
}

function renderComponents() {
  const gridEl = document.getElementById('productsGrid');
  const statusEl = document.getElementById('productsStatus');
  if (!gridEl || !statusEl) return;

  if (productsState.components.length === 0) {
    statusEl.textContent = 'No components found for the current filter.';
    gridEl.innerHTML = '';
    return;
  }

  statusEl.textContent = `Showing ${productsState.components.length} component(s)`;
  gridEl.innerHTML = productsState.components.map(component => `
    <article class="product-card">
      <div class="product-card-top">
        <span class="product-category">${CATEGORY_LABELS[component.category] || component.category}</span>
        <span class="product-stock">Stock: ${component.stock}</span>
      </div>
      <h3>${component.name}</h3>
      <p class="product-brand">${component.brand || 'Generic'}</p>
      <p class="product-description">${component.description || 'No description yet.'}</p>
      <div class="product-highlights">
        ${(component.highlights || []).map(item => `<span>${item}</span>`).join('')}
      </div>
      <div class="product-meta">
        <div>
          <small>Power</small>
          <strong>${component.power || 0}W</strong>
        </div>
        <div>
          <small>Price</small>
          <strong>${formatPrice(component.price)}</strong>
        </div>
      </div>
      <div class="product-card-actions">
        <button type="button" class="btn btn-primary" data-add-component='${JSON.stringify({
          _id: component._id,
          category: component.category,
          name: component.name,
          price: component.price,
          power: component.power,
          brand: component.brand,
        }).replace(/'/g, '&#39;')}'>Add to Build</button>
        <a href="dashboard.html" class="btn btn-outline-secondary">View Build</a>
      </div>
    </article>
  `).join('');

  gridEl.querySelectorAll('[data-add-component]').forEach(button => {
    button.addEventListener('click', () => {
      const component = JSON.parse(button.dataset.addComponent);
      const currentBuild = getBuild();
      currentBuild[component.category] = component;
      saveBuild(currentBuild);
      showPopup(`${component.name} added to your build`);
    });
  });
}

async function loadCategories() {
  const response = await fetch(`${COMPONENT_API_BASE_URL}/categories`);
  if (!response.ok) {
    throw new Error('Failed to load categories');
  }

  productsState.categories = await response.json();
  renderCategoryFilters();
}

async function loadComponents() {
  const statusEl = document.getElementById('productsStatus');
  if (statusEl) {
    statusEl.textContent = 'Loading components...';
  }

  const params = new URLSearchParams();
  if (productsState.activeCategory && productsState.activeCategory !== 'all') {
    params.set('category', productsState.activeCategory);
  }
  if (productsState.searchText) {
    params.set('q', productsState.searchText);
  }

  const queryString = params.toString();
  const response = await fetch(`${COMPONENT_API_BASE_URL}${queryString ? `?${queryString}` : ''}`);
  if (!response.ok) {
    throw new Error('Failed to load components');
  }

  productsState.components = await response.json();
  renderComponents();
}

document.addEventListener('DOMContentLoaded', async () => {
  updateProductsTitle();

  const searchInput = document.getElementById('componentSearch');
  if (searchInput) {
    searchInput.addEventListener('input', event => {
      productsState.searchText = event.target.value.trim();
      loadComponents().catch(error => {
        console.error(error);
        document.getElementById('productsStatus').textContent = 'Cannot load components right now.';
      });
    });
  }

  try {
    await loadCategories();
    await loadComponents();
  } catch (error) {
    console.error(error);
    const statusEl = document.getElementById('productsStatus');
    if (statusEl) {
      statusEl.textContent = 'Cannot load components right now.';
    }
  }
});