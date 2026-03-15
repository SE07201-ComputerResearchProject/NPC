const COMPONENT_API_BASE_URL = 'http://localhost:3000/api/components';

const searchParams = new URLSearchParams(window.location.search);
const initialCategory = searchParams.get('category') || 'all';
const initialPage = Math.max(1, Number(searchParams.get('page')) || 1);

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
  activeCategory: initialCategory,
  searchText: '',
  currentPage: initialPage,
  pageSize: 9,
  currentPageByCategory: {
    [initialCategory]: initialPage,
  },
};

function syncProductsUrl() {
  const params = new URLSearchParams();

  if (productsState.activeCategory !== 'all') {
    params.set('category', productsState.activeCategory);
  }

  if (productsState.currentPage > 1) {
    params.set('page', String(productsState.currentPage));
  }

  const queryString = params.toString();
  const nextUrl = queryString ? `products.html?${queryString}` : 'products.html';
  window.history.replaceState({}, '', nextUrl);
}

function setCurrentPage(page) {
  const safePage = Math.max(1, Number(page) || 1);
  productsState.currentPage = safePage;
  productsState.currentPageByCategory[productsState.activeCategory] = safePage;
  syncProductsUrl();
}

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

  const allFilter = {
    key: 'all',
    total: productsState.categories.reduce((sum, category) => sum + category.total, 0),
  };
  const allCategories = [allFilter, ...productsState.categories];

  filtersEl.innerHTML = allCategories
    .map(
      category => `
    <button
      type="button"
      class="filter-chip ${category.key === productsState.activeCategory ? 'active' : ''}"
      data-category="${category.key}"
    >
      <span>${CATEGORY_LABELS[category.key] || category.key}</span>
      <strong>${category.total}</strong>
    </button>
  `
    )
    .join('');

  filtersEl.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      const { category } = button.dataset;

      productsState.currentPageByCategory[productsState.activeCategory] = productsState.currentPage;
      productsState.activeCategory = category;
      productsState.currentPage = productsState.currentPageByCategory[category] || 1;

      syncProductsUrl();
      updateProductsTitle();
      renderCategoryFilters();

      loadComponents().catch(error => {
        console.error(error);
        const statusEl = document.getElementById('productsStatus');
        if (statusEl) statusEl.textContent = 'Cannot load components right now.';
      });
    });
  });
}

function renderPagination(totalPages) {
  const paginationEl = document.getElementById('productsPagination');
  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(`
      <button type="button" class="page-btn ${page === productsState.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>
    `);
  }

  paginationEl.innerHTML = `
    <button
      type="button"
      class="page-nav"
      data-nav="prev"
      ${productsState.currentPage === 1 ? 'disabled' : ''}
      aria-label="Previous page"
    >
      <i data-lucide="chevron-left"></i>
    </button>
    <div class="page-numbers">${pages.join('')}</div>
    <button
      type="button"
      class="page-nav"
      data-nav="next"
      ${productsState.currentPage === totalPages ? 'disabled' : ''}
      aria-label="Next page"
    >
      <i data-lucide="chevron-right"></i>
    </button>
  `;

  paginationEl.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      setCurrentPage(button.dataset.page);
      renderComponents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  paginationEl.querySelectorAll('[data-nav]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.nav === 'prev' && productsState.currentPage > 1) {
        setCurrentPage(productsState.currentPage - 1);
      }
      if (button.dataset.nav === 'next' && productsState.currentPage < totalPages) {
        setCurrentPage(productsState.currentPage + 1);
      }
      renderComponents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderComponents() {
  const gridEl = document.getElementById('productsGrid');
  const statusEl = document.getElementById('productsStatus');
  const paginationEl = document.getElementById('productsPagination');
  if (!gridEl || !statusEl || !paginationEl) return;

  if (productsState.components.length === 0) {
    statusEl.textContent = 'No components found for the current filter.';
    gridEl.innerHTML = '';
    paginationEl.innerHTML = '';
    return;
  }

  const totalItems = productsState.components.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / productsState.pageSize));
  if (productsState.currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const startIndex = (productsState.currentPage - 1) * productsState.pageSize;
  const endIndex = Math.min(startIndex + productsState.pageSize, totalItems);
  const pageItems = productsState.components.slice(startIndex, endIndex);

  statusEl.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} component(s)`;
  gridEl.innerHTML = pageItems
    .map(
      component => `
    <article class="product-card">
      <div class="product-card-top">
        <span class="product-category">${CATEGORY_LABELS[component.category] || component.category}</span>
        <span class="product-stock">Stock: ${component.stock}</span>
      </div>
      <h3>${component.name}</h3>
      <p class="product-brand">${component.brand || 'Generic'}</p>
      <div class="product-image-grid" aria-label="Image placeholders for ${component.name}">
        <div class="image-slot image-slot-main">Add Main Image</div>
        <div class="image-slot">Add Image</div>
        <div class="image-slot">Add Image</div>
        <div class="image-slot">Add Image</div>
      </div>
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
        <button type="button" class="btn btn-primary" data-add-cart='${JSON.stringify({
          _id: component._id,
          category: component.category,
          name: component.name,
          price: component.price,
          power: component.power,
          brand: component.brand,
        }).replace(/'/g, '&#39;')}'>Add to Cart</button>
        <button type="button" class="btn btn-outline-secondary" data-add-component='${JSON.stringify({
          _id: component._id,
          category: component.category,
          name: component.name,
          price: component.price,
          power: component.power,
          brand: component.brand,
        }).replace(/'/g, '&#39;')}'>Add to Build</button>
      </div>
    </article>
  `
    )
    .join('');

  gridEl.querySelectorAll('[data-add-cart]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!getAuthToken()) {
        showPopup('Please log in to save items to your cart.');
        toggleAuthPopup(new Event('click'));
        return;
      }

      const component = JSON.parse(button.dataset.addCart);
      try {
        await addToCart(component);
        showPopup(`${component.name} added to cart`);
      } catch (error) {
        showPopup(error.message || 'Cannot update cart right now.');
      }
    });
  });

  gridEl.querySelectorAll('[data-add-component]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!getAuthToken()) {
        showPopup('Please log in to save components to your build.');
        toggleAuthPopup(new Event('click'));
        return;
      }

      const component = JSON.parse(button.dataset.addComponent);
      const currentBuild = getBuild();
      currentBuild[component.category] = component;
      try {
        await saveBuild(currentBuild);
        showPopup(`${component.name} added to your build`);
      } catch (error) {
        showPopup(error.message || 'Cannot update build right now.');
      }
    });
  });

  renderPagination(totalPages);
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
  productsState.currentPage = productsState.currentPageByCategory[productsState.activeCategory] || 1;
  renderComponents();
}

document.addEventListener('DOMContentLoaded', async () => {
  updateProductsTitle();

  const searchInput = document.getElementById('componentSearch');
  if (searchInput) {
    searchInput.addEventListener('input', event => {
      productsState.searchText = event.target.value.trim();
      setCurrentPage(1);

      loadComponents().catch(error => {
        console.error(error);
        const statusEl = document.getElementById('productsStatus');
        if (statusEl) {
          statusEl.textContent = 'Cannot load components right now.';
        }
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
