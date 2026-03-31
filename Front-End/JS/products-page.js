const COMPONENT_API_BASE_URL = 'http://localhost:3001/api/components';

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

const DEFAULT_COMPONENT_IMAGE = 'Assets/Logo/logo.png';

const productsState = {
  categories: [],
  components: [],
  allComponents: [],        // unfiltered master list for current category + search
  activeCategory: initialCategory,
  searchText: '',
  currentPage: initialPage,
  pageSize: 9,
  currentPageByCategory: {
    [initialCategory]: initialPage,
  },
  filter: {
    priceMin: 0,
    priceMax: Infinity,
    priceAbsMin: 0,
    priceAbsMax: 0,
    brands: new Set(),      // empty = all brands shown
  },
};

let pendingProductsRequests = 0;
let productCardRevealObserver = null;
let productDetailsEscHandler = null;
let componentsAbortController = null;
let componentsSearchDebounceTimer = null;

const COMPONENTS_CACHE_TTL_MS = 60_000;
const componentsCache = new Map();

function getComponentImages(component, maxItems = 3) {
  const fromArray = Array.isArray(component?.imageUrls)
    ? component.imageUrls.map(item => String(item || '').trim()).filter(Boolean)
    : [];

  if (fromArray.length > 0) {
    return fromArray.slice(0, maxItems);
  }

  const single = String(component?.imageUrl || '').trim();
  if (single) {
    return [single];
  }

  return [DEFAULT_COMPONENT_IMAGE];
}

function setProductsLoaderVisible(isVisible) {
  const overlay = document.getElementById('productsLoaderOverlay');
  if (!overlay) return;

  overlay.classList.toggle('hidden', !isVisible);
}

function beginProductsLoading() {
  pendingProductsRequests += 1;
  setProductsLoaderVisible(true);
}

function endProductsLoading() {
  pendingProductsRequests = Math.max(0, pendingProductsRequests - 1);
  if (pendingProductsRequests === 0) {
    setProductsLoaderVisible(false);
  }
}

function scrollProductsPageToTop() {
  const productsPageEl = document.querySelector('.products-page');
  if (!productsPageEl) return;

  const top = productsPageEl.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function observeProductCardReveal() {
  const cards = document.querySelectorAll('.product-card');
  if (!cards.length) return;

  if (productCardRevealObserver) {
    productCardRevealObserver.disconnect();
  }

  const canObserve = 'IntersectionObserver' in window;
  if (!canObserve) {
    cards.forEach(card => {
      card.classList.add('reveal-card', 'is-visible');
    });
    return;
  }

  productCardRevealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-visible');
        productCardRevealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  cards.forEach((card, index) => {
    card.classList.add('reveal-card');
    card.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
    productCardRevealObserver.observe(card);
  });
}

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

function formatSpecLabel(label) {
  const text = String(label || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();

  if (!text) return 'Spec';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatSpecValue(value) {
  if (Array.isArray(value)) {
    return value.map(formatSpecValue).join(', ');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, nested]) => `${formatSpecLabel(key)}: ${formatSpecValue(nested)}`)
      .join(' | ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value ?? '-');
}

function isPerformanceSpecKey(key) {
  return /(clock|speed|rpm|airflow|pressure|latency|tdp|power|wattage|read|write|boost|cores|threads|vram|cache)/i.test(String(key || ''));
}

function buildSpecsSections(component) {
  const specsEntries = Object.entries(component?.specs || {});
  const generalRows = [];
  const performanceRows = [];

  specsEntries.forEach(([label, value]) => {
    const row = [formatSpecLabel(label), formatSpecValue(value)];
    if (isPerformanceSpecKey(label)) {
      performanceRows.push(row);
    } else {
      generalRows.push(row);
    }
  });

  const productInfoRows = [
    ['Manufacturer', component.brand || 'Generic'],
    ['Product Name', component.name || 'Unknown'],
    ['Category', CATEGORY_LABELS[component.category] || component.category || 'Unknown'],
    ['Price', formatPrice(component.price)],
    ['Stock', component.stock ?? 0],
  ];

  return {
    productInfoRows,
    generalRows,
    performanceRows,
  };
}

function renderSpecsTable(rows, emptyMessage) {
  if (!rows.length) {
    return `<p class="product-spec-empty">${escapeHtml(emptyMessage)}</p>`;
  }

  return `
    <div class="product-spec-table">
      ${rows
        .map(
          ([label, value]) => `
        <div class="product-spec-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

async function addComponentToBuild(component) {
  const currentBuild = getBuild();
  currentBuild[component.category] = component;
  await saveBuild(currentBuild);
  showPopup(getAuthToken()
    ? `${component.name} added to your build`
    : `${component.name} added to your guest build`);
}

async function buyComponentNow(component) {
  if (!getAuthToken()) {
    showPopup('Please log in to continue with Buy Now.');
    toggleAuthPopup(new Event('click'));
    return;
  }

  await addToCart(component);
  showPopup(`${component.name} added to cart`);
  window.location.href = 'shopping-cart.html';
}

function closeProductDetailsModal() {
  const backdrop = document.getElementById('productSpecsBackdrop');
  if (backdrop) {
    backdrop.remove();
  }

  if (productDetailsEscHandler) {
    document.removeEventListener('keydown', productDetailsEscHandler);
    productDetailsEscHandler = null;
  }

  document.body.classList.remove('modal-open-lite');
}

function setMainProductImageWithSlide(mainImageEl, nextSrc) {
  if (!mainImageEl || !nextSrc) return;
  if (mainImageEl.getAttribute('src') === nextSrc) return;

  mainImageEl.classList.remove('is-sliding');
  mainImageEl.setAttribute('src', nextSrc);
  // Force reflow so the animation can replay on each thumbnail click.
  void mainImageEl.offsetWidth;
  mainImageEl.classList.add('is-sliding');
}

function openProductDetailsModal(component) {
  if (!component) return;

  closeProductDetailsModal();

  const { productInfoRows, generalRows, performanceRows } = buildSpecsSections(component);
  const highlights = Array.isArray(component.highlights) ? component.highlights : [];

  const backdrop = document.createElement('div');
  backdrop.id = 'productSpecsBackdrop';
  backdrop.className = 'product-spec-backdrop';
  const modalImages = getComponentImages(component, 3);
  const mainImage = modalImages[0] || '';
  const illustrationHtml = mainImage
    ? `<img src="${escapeHtml(mainImage)}" alt="${escapeHtml(component.name)} illustration" data-product-main-image />`
    : `<div class="product-illustration-placeholder">Illustration image placeholder<br />Add product image later</div>`;
  const thumbHtml = Array.from({ length: 3 }).map((_, index) => {
    const image = modalImages[index] || '';
    const activeClass = index === 0 && image ? 'is-active' : '';

    if (!image) {
      return '<span class="is-empty" aria-hidden="true"></span>';
    }

    return `
      <button
        type="button"
        class="product-thumb ${activeClass}"
        data-product-thumb
        data-image-src="${escapeHtml(image)}"
        aria-label="View image ${index + 1}"
      >
        <img src="${escapeHtml(image)}" alt="${escapeHtml(component.name)} thumbnail ${index + 1}" />
      </button>
    `;
  }).join('');

  backdrop.innerHTML = `
    <section class="product-spec-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(component.name)} specs">
      <header class="product-spec-header">
        <div>
          <p class="product-spec-kicker">Part Details</p>
          <h3>${escapeHtml(component.name)}</h3>
        </div>
        <button type="button" class="product-spec-close" data-close-product-spec aria-label="Close">&times;</button>
      </header>
      <div class="product-spec-body">
        <aside class="product-detail-left">
          <div class="product-image-panel">
            <div class="product-image-main">
              ${illustrationHtml}
            </div>
            <div class="product-image-thumbs" aria-label="More product images">
              ${thumbHtml}
            </div>
          </div>

          <section class="product-detail-section">
            <h4>Product Information</h4>
            ${renderSpecsTable(productInfoRows, 'No product information yet.')}
          </section>

          <section class="product-detail-section">
            <h4>General Specifications</h4>
            ${renderSpecsTable(generalRows, 'No general specifications yet.')}
          </section>

          <section class="product-detail-section">
            <h4>Performance</h4>
            ${renderSpecsTable(performanceRows, 'No performance data yet.')}
          </section>
        </aside>

        <div class="product-detail-right">
          <div class="product-detail-top">
            <span class="product-detail-category">${escapeHtml(CATEGORY_LABELS[component.category] || component.category)}</span>
            <p class="product-detail-price-label">Best Price</p>
            <p class="product-detail-price">${formatPrice(component.price)}</p>
            <p class="product-detail-description">${escapeHtml(component.description || 'No description yet.')}</p>
          </div>

          <div class="product-detail-actions">
            <button type="button" class="btn btn-outline-secondary" data-popup-add-build>Add To Build</button>
            <button type="button" class="btn btn-primary" data-popup-buy-now>Buy Now</button>
          </div>

          ${highlights.length
            ? `<div class="product-spec-highlights">${highlights
                .map(item => `<span>${escapeHtml(item)}</span>`)
                .join('')}</div>`
            : ''}
        </div>
      </div>
    </section>
  `;

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop || event.target.closest('[data-close-product-spec]')) {
      closeProductDetailsModal();
    }
  });

  productDetailsEscHandler = event => {
    if (event.key === 'Escape') {
      closeProductDetailsModal();
    }
  };
  document.addEventListener('keydown', productDetailsEscHandler);

  const addBuildButton = backdrop.querySelector('[data-popup-add-build]');
  if (addBuildButton) {
    addBuildButton.addEventListener('click', async () => {
      try {
        await addComponentToBuild(component);
      } catch (error) {
        showPopup(error.message || 'Cannot update build right now.');
      }
    });
  }

  const buyNowButton = backdrop.querySelector('[data-popup-buy-now]');
  if (buyNowButton) {
    buyNowButton.addEventListener('click', async () => {
      try {
        await buyComponentNow(component);
      } catch (error) {
        showPopup(error.message || 'Cannot complete Buy Now right now.');
      }
    });
  }

  const mainImageEl = backdrop.querySelector('[data-product-main-image]');
  const thumbButtons = Array.from(backdrop.querySelectorAll('[data-product-thumb]'));
  if (mainImageEl && thumbButtons.length) {
    mainImageEl.addEventListener('animationend', () => {
      mainImageEl.classList.remove('is-sliding');
    });

    thumbButtons.forEach(button => {
      button.addEventListener('click', () => {
        const src = button.dataset.imageSrc || '';
        if (!src) return;

        setMainProductImageWithSlide(mainImageEl, src);
        thumbButtons.forEach(item => item.classList.remove('is-active'));
        button.classList.add('is-active');
      });
    });
  }

  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open-lite');
}

function updateProductsTitle() {
  const title = document.getElementById('productsTitle');
  if (!title) return;
  title.textContent = CATEGORY_LABELS[productsState.activeCategory] || 'Browse Components';
}

// ─── Filter helpers ────────────────────────────────────────────

function formatPriceShort(price) {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (price >= 1_000)     return `${(price / 1_000).toFixed(0)}K`;
  return `${Math.round(price)}`;
}

function updatePriceFill() {
  const fill   = document.getElementById('filterPriceFill');
  const minEl  = document.getElementById('filterRangeMin');
  const maxEl  = document.getElementById('filterRangeMax');
  if (!fill || !minEl || !maxEl) return;
  const lo = Number(minEl.value);
  const hi = Number(maxEl.value);
  fill.style.left  = `${lo}%`;
  fill.style.width = `${hi - lo}%`;
}

function applyFilters() {
  const { filter, allComponents } = productsState;
  productsState.components = allComponents.filter(c => {
    const price = c.price || 0;
    if (price < filter.priceMin || price > filter.priceMax) return false;
    if (filter.brands.size > 0 && !filter.brands.has(String(c.brand || 'Generic').trim())) return false;
    return true;
  });
  setCurrentPage(1);
  renderComponents();
}

function renderFilterSidebar() {
  const { allComponents, filter } = productsState;

  // ── Price bounds ──────────────────────────────────────────────
  const prices = allComponents.map(c => c.price || 0).filter(p => p > 0);
  const absMin = prices.length ? Math.min(...prices) : 0;
  const absMax = prices.length ? Math.max(...prices) : 0;

  if (filter.priceAbsMin !== absMin || filter.priceAbsMax !== absMax) {
    filter.priceAbsMin = absMin;
    filter.priceAbsMax = absMax;
    filter.priceMin    = absMin;
    filter.priceMax    = absMax;
  }

  // Update labels
  const minLabel = document.getElementById('filterPriceMin');
  const maxLabel = document.getElementById('filterPriceMax');
  if (minLabel) minLabel.textContent = `${formatPriceShort(filter.priceMin)} VND`;
  if (maxLabel) maxLabel.textContent = `${formatPriceShort(filter.priceMax)} VND`;

  // Update sliders — replace nodes to clear previous listeners
  const oldMin = document.getElementById('filterRangeMin');
  const oldMax = document.getElementById('filterRangeMax');
  if (oldMin && oldMax) {
    const newMin = oldMin.cloneNode(true);
    const newMax = oldMax.cloneNode(true);
    const range  = absMax > absMin ? absMax - absMin : 1;

    newMin.value = absMax > absMin ? Math.round(((filter.priceMin - absMin) / range) * 100) : 0;
    newMax.value = absMax > absMin ? Math.round(((filter.priceMax - absMin) / range) * 100) : 100;

    oldMin.replaceWith(newMin);
    oldMax.replaceWith(newMax);
    updatePriceFill();

    function onSlider() {
      let lo = Number(newMin.value);
      let hi = Number(newMax.value);
      if (lo > hi) { if (this === newMin) { newMin.value = hi; lo = hi; } else { newMax.value = lo; hi = lo; } }
      filter.priceMin = absMin + Math.round((lo / 100) * range);
      filter.priceMax = absMin + Math.round((hi / 100) * range);
      if (minLabel) minLabel.textContent = `${formatPriceShort(filter.priceMin)} VND`;
      if (maxLabel) maxLabel.textContent = `${formatPriceShort(filter.priceMax)} VND`;
      updatePriceFill();
      applyFilters();
    }
    newMin.addEventListener('input', onSlider);
    newMax.addEventListener('input', onSlider);
  }

  // ── Brand list ────────────────────────────────────────────────
  const brandMap = new Map();
  allComponents.forEach(c => {
    const b = String(c.brand || 'Generic').trim();
    brandMap.set(b, (brandMap.get(b) || 0) + 1);
  });
  const sortedBrands = [...brandMap.entries()].sort((a, b) => b[1] - a[1]);

  const brandList = document.getElementById('filterBrandList');
  if (brandList) {
    if (!sortedBrands.length) {
      brandList.innerHTML = '<span style="color:#adb5bd;font-size:12px;">No brands</span>';
    } else {
      brandList.innerHTML = sortedBrands.map(([brand, count]) => {
        const checked = filter.brands.size === 0 || filter.brands.has(brand) ? 'checked' : '';
        return `
          <label class="filter-brand-item">
            <input type="checkbox" data-brand="${escapeHtml(brand)}" ${checked}>
            <span class="filter-brand-name">${escapeHtml(brand)}</span>
            <span class="filter-brand-count">${count}</span>
          </label>`;
      }).join('');

      brandList.querySelectorAll('input[data-brand]').forEach(cb => {
        cb.addEventListener('change', () => {
          const all  = [...brandList.querySelectorAll('input[data-brand]')];
          const chkd = all.filter(el => el.checked).map(el => el.dataset.brand);
          filter.brands = (chkd.length === 0 || chkd.length === all.length)
            ? new Set()
            : new Set(chkd);
          applyFilters();
        });
      });
    }
  }

  // Reset button — replace node to avoid stacking listeners
  const oldReset = document.getElementById('filterResetBtn');
  if (oldReset) {
    const newReset = oldReset.cloneNode(true);
    oldReset.replaceWith(newReset);
    newReset.addEventListener('click', () => {
      filter.brands   = new Set();
      filter.priceMin = filter.priceAbsMin;
      filter.priceMax = filter.priceAbsMax;
      renderFilterSidebar();
      applyFilters();
    });
  }
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
      scrollProductsPageToTop();
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
  const pageItemsMap = new Map(pageItems.map(item => [String(item._id), item]));

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
      <div class="product-image-grid product-image-single" aria-label="Product image for ${component.name}">
        <div class="image-slot image-slot-photo">
          <img src="${escapeHtml(getComponentImages(component, 1)[0])}" alt="${escapeHtml(component.name)}" loading="lazy" />
        </div>
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
        <button type="button" class="btn btn-outline-dark" data-view-more="${String(component._id)}">View More</button>
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
      const component = JSON.parse(button.dataset.addComponent);
      try {
        await addComponentToBuild(component);
      } catch (error) {
        showPopup(error.message || 'Cannot update build right now.');
      }
    });
  });

  gridEl.querySelectorAll('[data-view-more]').forEach(button => {
    button.addEventListener('click', () => {
      const component = pageItemsMap.get(button.dataset.viewMore);
      openProductDetailsModal(component);
    });
  });

  observeProductCardReveal();
  renderPagination(totalPages);
}

async function loadCategories() {
  beginProductsLoading();

  try {
    const response = await fetch(`${COMPONENT_API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error('Failed to load categories');
    }

    productsState.categories = await response.json();
    renderCategoryFilters();
  } finally {
    endProductsLoading();
  }
}

async function loadComponents() {
  beginProductsLoading();

  if (componentsAbortController) {
    componentsAbortController.abort();
  }
  componentsAbortController = new AbortController();
  const currentController = componentsAbortController;

  try {
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
  const cacheKey = queryString || 'all';
  const cachedEntry = componentsCache.get(cacheKey);
  const isCacheFresh = cachedEntry && (Date.now() - cachedEntry.cachedAt) < COMPONENTS_CACHE_TTL_MS;

  let data;
  if (isCacheFresh) {
    data = cachedEntry.data;
  } else {
    const response = await fetch(`${COMPONENT_API_BASE_URL}${queryString ? `?${queryString}` : ''}`, {
      signal: currentController.signal,
    });

    if (!response.ok) {
      throw new Error('Failed to load components');
    }

    data = await response.json();
    componentsCache.set(cacheKey, {
      data,
      cachedAt: Date.now(),
    });
  }

  if (currentController.signal.aborted) {
    return;
  }

  // Reset filter bounds on every fresh load (new category / search)
  productsState.allComponents       = data;
  productsState.filter.priceAbsMin  = 0;
  productsState.filter.priceAbsMax  = 0;
  productsState.filter.priceMin     = 0;
  productsState.filter.priceMax     = Infinity;
  productsState.filter.brands       = new Set();
  productsState.currentPage = productsState.currentPageByCategory[productsState.activeCategory] || 1;

  renderFilterSidebar();
  applyFilters();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    throw error;
  } finally {
    if (componentsAbortController === currentController) {
      componentsAbortController = null;
    }
    endProductsLoading();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  updateProductsTitle();

  const searchInput = document.getElementById('componentSearch');
  if (searchInput) {
    searchInput.addEventListener('input', event => {
      productsState.searchText = event.target.value.trim();
      setCurrentPage(1);
      scrollProductsPageToTop();

      clearTimeout(componentsSearchDebounceTimer);
      componentsSearchDebounceTimer = setTimeout(() => {
        loadComponents().catch(error => {
          console.error(error);
          const statusEl = document.getElementById('productsStatus');
          if (statusEl) {
            statusEl.textContent = 'Cannot load components right now.';
          }
        });
      }, 280);
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
