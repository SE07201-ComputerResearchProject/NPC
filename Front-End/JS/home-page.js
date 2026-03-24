/**
 * home-page.js
 * Handles all homepage-specific logic:
 *  - Preloader display / cooldown
 *  - Hero bottom-right image slider
 *  - Scroll-reveal for home sections
 *  - Contact form UI feedback
 *  - Featured builds: fetch from API, render cards, load into dashboard
 */

(function () {
  'use strict';

  const APP_CONFIG = window.APP_CONFIG || {};
  const FEATURED_BUILDS_API = APP_CONFIG.FEATURED_BUILDS_API || 'http://localhost:3001/api/featured-builds';

  // ──────────────────────────────────────────────────────────────
  //  Preloader
  // ──────────────────────────────────────────────────────────────
  (function initPreloader() {
    const preloader = document.getElementById('homePreloader');
    if (!preloader) return;

    if (!window.__showHomePreloader) {
      preloader.classList.add('hidden');
      return;
    }

    setTimeout(() => {
      preloader.classList.add('hidden');
      try {
        localStorage.setItem('homePreloaderLastShownAt', String(Date.now()));
        localStorage.removeItem('homePreloaderShown');
      } catch {
        // Ignore storage write errors.
      }
    }, 2000);
  })();

  // ──────────────────────────────────────────────────────────────
  //  Hero slider
  // ──────────────────────────────────────────────────────────────
  (function initHeroSlider() {
    const slider = document.getElementById('heroSlider');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll('.hero-slide'));
    const prevBtn = document.getElementById('heroPrevSlide');
    const nextBtn = document.getElementById('heroNextSlide');
    const kickerEl = document.getElementById('heroSliderKicker');
    const titleEl = document.getElementById('heroSliderTitle');
    const descriptionEl = document.getElementById('heroSliderDescription');
    if (!slides.length) return;

    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let activeIndex = 0;
    let sliderTimer;

    function syncText(slide) {
      if (kickerEl) {
        kickerEl.textContent = slide.dataset.kicker || 'Featured Part';
      }
      if (titleEl) {
        titleEl.textContent = slide.dataset.title || 'Featured Component';
      }
      if (descriptionEl) {
        descriptionEl.textContent = slide.dataset.description || '';
      }
    }

    function animateSlide(slide) {
      if (prefersReducedMotion || typeof window.anime !== 'function') return;
      window.anime.remove(slide);
      window.anime({
        targets: slide,
        scale: [1.02, 1.08],
        translateX: [-4, 8],
        duration: 3200,
        easing: 'easeInOutSine',
        direction: 'alternate',
      });
    }

    function setActive(nextIndex) {
      if (nextIndex === activeIndex) return;

      slides[activeIndex].classList.remove('is-active');

      activeIndex = nextIndex;

      slides[activeIndex].classList.add('is-active');
      syncText(slides[activeIndex]);
      animateSlide(slides[activeIndex]);
    }

    function nextSlide() {
      setActive((activeIndex + 1) % slides.length);
    }

    function prevSlide() {
      setActive((activeIndex - 1 + slides.length) % slides.length);
    }

    function restartTimer() {
      clearInterval(sliderTimer);
      sliderTimer = setInterval(nextSlide, 3000);
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        restartTimer();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        restartTimer();
      });
    }

    slider.addEventListener('mouseenter', () => clearInterval(sliderTimer));
    slider.addEventListener('mouseleave', restartTimer);

    syncText(slides[activeIndex]);
    animateSlide(slides[activeIndex]);
    restartTimer();
  })();

  // ──────────────────────────────────────────────────────────────
  //  Scroll-reveal for home sections
  // ──────────────────────────────────────────────────────────────
  (function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.home-section').forEach(section => observer.observe(section));
  })();

  // ──────────────────────────────────────────────────────────────
  //  Contact form – UI only
  // ──────────────────────────────────────────────────────────────
  window.handleContactSubmit = function (e) {
    e.preventDefault();
    if (typeof showPopup === 'function') {
      showPopup("Message sent! We'll get back to you soon.", { duration: 3500 });
    }
    e.target.reset();
  };

  // ──────────────────────────────────────────────────────────────
  //  Featured Builds
  // ──────────────────────────────────────────────────────────────

  /**
   * Fetch presets from the backend and render them into #featuredBuildsGrid.
   */
  async function loadFeaturedBuildsFromApi() {
    const grid = document.getElementById('featuredBuildsGrid');
    if (!grid) return;

    try {
      const res = await fetch(FEATURED_BUILDS_API);
      if (!res.ok) throw new Error('API error');
      const builds = await res.json();
      renderFeaturedBuilds(builds, grid);
    } catch {
      // Silently keep the static fallback cards if the API is unavailable.
      console.warn('Featured builds API unavailable – keeping static cards.');
    }
  }

  function tierBadgeClass(tier) {
    return tier === 'mid' ? 'preset-badge--mid' : 'preset-badge--high';
  }

  function tierLabel(tier) {
    if (tier === 'mid') return 'Mid-Range';
    if (tier === 'budget') return 'Budget';
    return 'High-End';
  }

  const DISPLAY_PARTS = ['cpu', 'gpu', 'ram', 'motherboard', 'psu'];
  const PART_LABEL = { cpu: 'CPU', gpu: 'GPU', ram: 'RAM', motherboard: 'MB', psu: 'PSU' };

  function renderFeaturedBuilds(builds, grid) {
    const html = builds.map(build => {
      // parts is a plain object after JSON parse (Map was serialised by Mongoose .lean())
      const parts = build.parts || {};

      const partRows = DISPLAY_PARTS
        .filter(key => parts[key]?.name)
        .map(key => `
          <li>
            <span class="preset-part-label">${PART_LABEL[key]}</span>
            <span>${escapeHtml(parts[key].name)}</span>
          </li>`)
        .join('');

      return `
        <div class="col-lg-4 col-md-6">
          <div class="build-preset-card"
               onclick="loadFeaturedBuild('${escapeHtml(build.presetId)}')"
               role="button" tabindex="0"
               aria-label="Load ${escapeHtml(build.name)} build"
               onkeydown="if(event.key==='Enter'||event.key===' ')loadFeaturedBuild('${escapeHtml(build.presetId)}')">
            <div class="preset-badge ${tierBadgeClass(build.tier)}">${tierLabel(build.tier)}</div>
            <h3 class="preset-name">${escapeHtml(build.name)}</h3>
            <p class="preset-tagline">${escapeHtml(build.tagline || '')}</p>
            <ul class="preset-parts">${partRows}</ul>
            <div class="preset-footer">
              <span class="preset-price">${escapeHtml(build.estimatedPrice || '')}</span>
              <span class="preset-cta">Load Build <i data-lucide="arrow-right"></i></span>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;

    // Re-run Lucide so newly injected SVG icons render.
    if (window.lucide) window.lucide.createIcons();
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Navigate to the dashboard with the chosen preset loaded.
   * The preset data is written to sessionStorage so dashboard.js
   * can pick it up on load (existing behaviour, unchanged).
   */
  window.loadFeaturedBuild = async function (presetId) {
    try {
      const res = await fetch(`${FEATURED_BUILDS_API}/${encodeURIComponent(presetId)}`);
      if (!res.ok) throw new Error('Not found');
      const build = await res.json();

      // Normalise parts Map (Mongoose serialises Maps as plain objects).
      const parts = build.parts || {};

      sessionStorage.setItem('featuredBuildPreset', JSON.stringify({
        name: build.name,
        parts,
      }));
    } catch {
      console.warn(`Could not fetch preset "${presetId}" from API.`);
    }

    window.location.href = 'dashboard.html';
  };

  // Kick off the API fetch when the DOM is ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeaturedBuildsFromApi);
  } else {
    loadFeaturedBuildsFromApi();
  }
})();
