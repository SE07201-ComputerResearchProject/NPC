(function chatbotBootstrap() {
  const CHATBOT_STYLE_ID = 'npcChatbotStyle';
  const CHATBOT_ROOT_ID = 'npcChatbotRoot';
  const GEMINI_API_URL = 'http://localhost:3001/api/gemini';
  const COMPATIBILITY_API_URL = 'http://localhost:3001/api/compatibility/check';
  const COMPONENT_API_URL = 'http://localhost:3001/api/components';
  const CATEGORY_LABELS = {
    case: 'Case',
    cpu: 'CPU',
    motherboard: 'Motherboard',
    gpu: 'GPU',
    ram: 'RAM',
    storage: 'Storage',
    psu: 'PSU',
    cooler: 'Cooler',
    fan: 'Fan',
  };
  const REQUIRED_CATEGORIES = ['case', 'cpu', 'motherboard', 'ram', 'storage', 'psu'];
  const COMPONENTS_CACHE = new Map();

  function ensureStyles() {
    if (document.getElementById(CHATBOT_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = CHATBOT_STYLE_ID;
    style.textContent = `
      :root {
        --npc-chatbot-z: 1200;
        --npc-chatbot-bg: rgba(247, 247, 242, 0.92);
        --npc-chatbot-panel: rgba(255, 255, 255, 0.94);
        --npc-chatbot-border: rgba(20, 33, 61, 0.12);
        --npc-chatbot-text: #10213d;
        --npc-chatbot-muted: #66748c;
        --npc-chatbot-accent: #ff6b35;
        --npc-chatbot-accent-dark: #d94d1a;
        --npc-chatbot-soft: #fff2eb;
        --npc-chatbot-shadow: 0 20px 60px rgba(16, 33, 61, 0.18);
      }

      body.bg-dark {
        --npc-chatbot-bg: rgba(13, 18, 26, 0.9);
        --npc-chatbot-panel: rgba(18, 25, 36, 0.96);
        --npc-chatbot-border: rgba(255, 255, 255, 0.08);
        --npc-chatbot-text: #edf3ff;
        --npc-chatbot-muted: #9eb0c9;
        --npc-chatbot-soft: rgba(255, 107, 53, 0.12);
        --npc-chatbot-shadow: 0 20px 70px rgba(0, 0, 0, 0.4);
      }

      .npc-chatbot-root {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: var(--npc-chatbot-z);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .npc-chatbot-launch {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--npc-chatbot-accent), #ff8a5b);
        color: #fff;
        padding: 12px 18px;
        cursor: pointer;
        box-shadow: 0 18px 40px rgba(255, 107, 53, 0.28);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .npc-chatbot-launch:hover {
        transform: translateY(-2px);
        box-shadow: 0 22px 44px rgba(255, 107, 53, 0.34);
      }

      .npc-chatbot-launch:focus-visible,
      .npc-chatbot-send:focus-visible,
      .npc-chatbot-chip:focus-visible,
      .npc-chatbot-mini-link:focus-visible,
      .npc-chatbot-close:focus-visible {
        outline: 2px solid #ffd7c8;
        outline-offset: 2px;
      }

      .npc-chatbot-launch-icon {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.22);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
      }

      .npc-chatbot-badge {
        min-width: 24px;
        height: 24px;
        border-radius: 999px;
        padding: 0 8px;
        background: rgba(16, 33, 61, 0.2);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .npc-chatbot-panel {
        width: min(380px, calc(100vw - 24px));
        height: min(620px, calc(100vh - 110px));
        border-radius: 28px;
        border: 1px solid var(--npc-chatbot-border);
        background: var(--npc-chatbot-panel);
        color: var(--npc-chatbot-text);
        box-shadow: var(--npc-chatbot-shadow);
        overflow: hidden;
        display: none;
        flex-direction: column;
        backdrop-filter: blur(22px);
      }

      .npc-chatbot-root.is-open .npc-chatbot-panel {
        display: flex;
      }

      .npc-chatbot-root.is-focus .npc-chatbot-head,
      .npc-chatbot-root.is-focus .npc-chatbot-actions {
        display: none;
      }

      .npc-chatbot-root.is-focus .npc-chatbot-log {
        padding-top: 18px;
      }

      .npc-chatbot-head {
        padding: 18px 18px 14px;
        background:
          radial-gradient(circle at top right, rgba(255, 138, 91, 0.32), transparent 38%),
          linear-gradient(180deg, rgba(255, 107, 53, 0.15), transparent);
        border-bottom: 1px solid var(--npc-chatbot-border);
      }

      .npc-chatbot-head-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .npc-chatbot-head-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .npc-chatbot-kicker {
        margin: 0 0 6px;
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--npc-chatbot-accent);
      }

      .npc-chatbot-title {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 800;
      }

      .npc-chatbot-subtitle {
        margin: 6px 0 0;
        color: var(--npc-chatbot-muted);
        font-size: 0.9rem;
      }

      .npc-chatbot-close {
        border: 0;
        background: rgba(16, 33, 61, 0.06);
        color: var(--npc-chatbot-text);
        width: 34px;
        height: 34px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 1rem;
      }

      .npc-chatbot-icon-btn {
        border: 0;
        background: rgba(16, 33, 61, 0.06);
        color: var(--npc-chatbot-text);
        min-width: 34px;
        height: 34px;
        border-radius: 12px;
        cursor: pointer;
        padding: 0 10px;
        font-size: 0.82rem;
        font-weight: 700;
      }

      .npc-chatbot-overview {
        margin-top: 14px;
        padding: 14px;
        border-radius: 20px;
        background: var(--npc-chatbot-soft);
        display: grid;
        gap: 10px;
      }

      .npc-chatbot-overview-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
      }

      .npc-chatbot-overview-label {
        margin: 0;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--npc-chatbot-muted);
      }

      .npc-chatbot-overview-value {
        margin: 4px 0 0;
        font-size: 1.08rem;
        font-weight: 800;
      }

      .npc-chatbot-score {
        text-align: right;
        font-size: 0.85rem;
        color: var(--npc-chatbot-muted);
      }

      .npc-chatbot-progress {
        width: 100%;
        height: 10px;
        background: rgba(16, 33, 61, 0.08);
        border-radius: 999px;
        overflow: hidden;
      }

      .npc-chatbot-progress-bar {
        width: 0;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--npc-chatbot-accent), #ffb067);
        transition: width 0.3s ease;
      }

      .npc-chatbot-overview-text {
        margin: 0;
        color: var(--npc-chatbot-muted);
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .npc-chatbot-actions {
        padding: 14px 18px 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        border-bottom: 1px solid var(--npc-chatbot-border);
      }

      .npc-chatbot-part-picker {
        padding: 0 18px 14px;
        display: none;
        border-bottom: 1px solid var(--npc-chatbot-border);
      }

      .npc-chatbot-part-picker.is-open {
        display: grid;
        gap: 10px;
      }

      .npc-chatbot-picker-controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .npc-chatbot-select {
        width: 100%;
        border-radius: 14px;
        border: 1px solid var(--npc-chatbot-border);
        background: rgba(255, 255, 255, 0.7);
        color: var(--npc-chatbot-text);
        padding: 10px 12px;
        font-size: 0.88rem;
      }

      body.bg-dark .npc-chatbot-select {
        background: rgba(255, 255, 255, 0.04);
      }

      .npc-chatbot-picker-preview {
        min-height: 48px;
        border-radius: 16px;
        border: 1px dashed var(--npc-chatbot-border);
        padding: 10px 12px;
        font-size: 0.84rem;
        color: var(--npc-chatbot-muted);
        line-height: 1.5;
      }

      .npc-chatbot-picker-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .npc-chatbot-chip,
      .npc-chatbot-mini-link {
        border: 1px solid var(--npc-chatbot-border);
        background: rgba(255, 255, 255, 0.7);
        color: var(--npc-chatbot-text);
        border-radius: 999px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 600;
        text-decoration: none;
      }

      body.bg-dark .npc-chatbot-chip,
      body.bg-dark .npc-chatbot-select,
      body.bg-dark .npc-chatbot-mini-link {
        background: rgba(255, 255, 255, 0.04);
      }

      .npc-chatbot-log {
        flex: 1;
        overflow-y: auto;
        padding: 16px 18px 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
      }

      .npc-chatbot-row {
        display: flex;
      }

      .npc-chatbot-row.user {
        justify-content: flex-end;
      }

      .npc-chatbot-bubble {
        max-width: 85%;
        padding: 12px 14px;
        border-radius: 18px;
        line-height: 1.5;
        font-size: 0.92rem;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .npc-chatbot-row.user .npc-chatbot-bubble {
        background: linear-gradient(135deg, var(--npc-chatbot-accent), #ff8a5b);
        color: #fff;
        border-bottom-right-radius: 6px;
      }

      .npc-chatbot-row.bot .npc-chatbot-bubble,
      .npc-chatbot-row.system .npc-chatbot-bubble {
        background: rgba(16, 33, 61, 0.06);
        color: var(--npc-chatbot-text);
        border-bottom-left-radius: 6px;
      }

      body.bg-dark .npc-chatbot-row.bot .npc-chatbot-bubble,
      body.bg-dark .npc-chatbot-row.system .npc-chatbot-bubble {
        background: rgba(255, 255, 255, 0.06);
      }

      .npc-chatbot-links {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .npc-chatbot-compose {
        padding: 16px 18px 18px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        border-top: 1px solid var(--npc-chatbot-border);
      }

      .npc-chatbot-input {
        min-width: 0;
        border-radius: 16px;
        border: 1px solid var(--npc-chatbot-border);
        background: rgba(255, 255, 255, 0.7);
        color: var(--npc-chatbot-text);
        padding: 12px 14px;
        font-size: 0.95rem;
      }

      body.bg-dark .npc-chatbot-input {
        background: rgba(255, 255, 255, 0.04);
      }

      .npc-chatbot-send {
        border: 0;
        border-radius: 16px;
        background: var(--npc-chatbot-accent);
        color: #fff;
        padding: 0 16px;
        font-weight: 700;
        cursor: pointer;
      }

      .npc-chatbot-send:disabled,
      .npc-chatbot-input:disabled,
      .npc-chatbot-chip:disabled {
        opacity: 0.58;
        cursor: not-allowed;
      }

      .npc-chatbot-footer {
        grid-column: 1 / -1;
        margin: 0;
        font-size: 0.78rem;
        color: var(--npc-chatbot-muted);
      }

      @media (max-width: 767px) {
        .npc-chatbot-root {
          right: 12px;
          bottom: 12px;
          left: 12px;
          align-items: stretch;
        }

        .npc-chatbot-launch {
          justify-content: space-between;
        }

        .npc-chatbot-panel {
          width: 100%;
          height: min(78vh, 620px);
        }

        .npc-chatbot-picker-controls {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function parseGuestBuild() {
    try {
      return JSON.parse(localStorage.getItem('guestPcBuild') || '{}');
    } catch {
      return {};
    }
  }

  async function getBuildSnapshot() {
    if (typeof window.awaitCommerceStateReady === 'function') {
      try {
        await window.awaitCommerceStateReady();
      } catch {
        // Keep widget usable even if sync fails.
      }
    }

    const build = typeof window.getBuild === 'function' ? window.getBuild() : parseGuestBuild();
    const buildName = typeof window.getBuildName === 'function'
      ? window.getBuildName()
      : (localStorage.getItem('guestBuildName') || 'New Build');

    return {
      buildName,
      parts: build && typeof build === 'object' ? build : {},
    };
  }

  function selectedCategories(parts) {
    return Object.keys(CATEGORY_LABELS).filter(category => parts?.[category]?.name);
  }

  function missingCategories(parts, onlyRequired = false) {
    const categories = onlyRequired ? REQUIRED_CATEGORIES : Object.keys(CATEGORY_LABELS);
    return categories.filter(category => !parts?.[category]?.name);
  }

  function buildSummaryLines(parts) {
    return Object.entries(CATEGORY_LABELS)
      .filter(([category]) => parts?.[category]?.name)
      .map(([category, label]) => `${label}: ${parts[category].name}`);
  }

  function getNextCategory(parts) {
    const nextRequired = missingCategories(parts, true)[0];
    if (nextRequired) {
      return nextRequired;
    }

    return missingCategories(parts, false)[0] || '';
  }

  async function fetchCompatibility(parts) {
    const pickedCount = selectedCategories(parts).length;
    if (!pickedCount) {
      return null;
    }

    try {
      const response = await fetch(COMPATIBILITY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts }),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  function getPageLabel() {
    const pathname = window.location.pathname.split('/').pop() || 'index.html';
    const labels = {
      'index.html': 'homepage',
      'dashboard.html': 'builder page',
      'products.html': 'products page',
      'shopping-cart.html': 'shopping cart',
      'account.html': 'account page',
      'admin.html': 'admin page',
      'payment-success.html': 'payment success page',
      'payment-failed.html': 'payment failed page',
      'test.html': 'chatbot demo page',
    };

    return labels[pathname] || pathname;
  }

  function buildPreviewText(parts) {
    const missingRequired = missingCategories(parts, true);
    if (!selectedCategories(parts).length) {
      return {
        body: 'Start with CPU, motherboard and RAM. I can map the next step for you.',
        badge: '0/6',
      };
    }

    if (missingRequired.length) {
      return {
        body: `You still need ${missingRequired.slice(0, 2).map(category => CATEGORY_LABELS[category]).join(' + ')}${missingRequired.length > 2 ? '...' : ''}.`,
        badge: `${selectedCategories(parts).length}/9`,
      };
    }

    return {
      body: 'Open the copilot to review compatibility and finish the optional parts.',
      badge: `${selectedCategories(parts).length}/9`,
    };
  }

  async function fetchComponentsByCategory(category) {
    if (!category) {
      return [];
    }

    if (COMPONENTS_CACHE.has(category)) {
      return COMPONENTS_CACHE.get(category);
    }

    const response = await fetch(`${COMPONENT_API_URL}?category=${encodeURIComponent(category)}`);
    if (!response.ok) {
      throw new Error('Cannot load components for this category right now.');
    }

    const data = await response.json();
    const components = Array.isArray(data) ? data : [];
    COMPONENTS_CACHE.set(category, components);
    return components;
  }

  function normalizeComponentForBuild(component, fallbackCategory) {
    if (!component || typeof component !== 'object') {
      return null;
    }

    return {
      _id: String(component._id || component.id || ''),
      category: component.category || fallbackCategory || '',
      name: String(component.name || ''),
      brand: String(component.brand || ''),
      price: Number(component.price || 0),
      power: Number(component.power || 0),
    };
  }

  function createRoot() {
    if (document.getElementById(CHATBOT_ROOT_ID)) {
      return document.getElementById(CHATBOT_ROOT_ID);
    }

    const root = document.createElement('section');
    root.id = CHATBOT_ROOT_ID;
    root.className = 'npc-chatbot-root';
    root.innerHTML = `
      <button type="button" class="npc-chatbot-launch" aria-expanded="false" aria-controls="npcChatbotPanel">
        <span class="npc-chatbot-launch-icon">+</span>
        <span>Chatbot</span>
        <span class="npc-chatbot-badge" data-chatbot-badge>...</span>
      </button>
      <aside id="npcChatbotPanel" class="npc-chatbot-panel" aria-label="Build assistant chat">
        <header class="npc-chatbot-head">
          <div class="npc-chatbot-head-top">
            <div>
              <p class="npc-chatbot-kicker">Always-on guide</p>
              <h2 class="npc-chatbot-title">NPC Chatbot</h2>
              <p class="npc-chatbot-subtitle">I can inspect your current build, suggest the next part, add selected parts into the build, and call Gemini for deeper advice.</p>
            </div>
            <div class="npc-chatbot-head-actions">
              <button type="button" class="npc-chatbot-icon-btn" data-chatbot-toggle-focus aria-label="Toggle focus mode">Focus</button>
              <button type="button" class="npc-chatbot-close" aria-label="Close assistant">×</button>
            </div>
          </div>
          <div class="npc-chatbot-overview" data-chatbot-overview>
            <div class="npc-chatbot-overview-top">
              <div>
                <p class="npc-chatbot-overview-label">Current build</p>
                <p class="npc-chatbot-overview-value" data-chatbot-build-title>New Build</p>
              </div>
              <div class="npc-chatbot-score" data-chatbot-score>Compatibility waiting</div>
            </div>
            <div class="npc-chatbot-progress" aria-hidden="true">
              <div class="npc-chatbot-progress-bar" data-chatbot-progress></div>
            </div>
            <p class="npc-chatbot-overview-text" data-chatbot-summary>Loading build summary...</p>
          </div>
        </header>
        <div class="npc-chatbot-actions">
          <button type="button" class="npc-chatbot-chip" data-action="pick">Add part to build</button>
          <button type="button" class="npc-chatbot-chip" data-action="next">What is next?</button>
          <button type="button" class="npc-chatbot-chip" data-action="builder">Open builder</button>
        </div>
        <div class="npc-chatbot-part-picker" data-chatbot-picker>
          <div class="npc-chatbot-picker-controls">
            <select class="npc-chatbot-select" data-chatbot-category>
              <option value="">Choose category</option>
              <option value="cpu">CPU</option>
              <option value="motherboard">Motherboard</option>
              <option value="ram">RAM</option>
              <option value="storage">Storage</option>
              <option value="psu">PSU</option>
              <option value="case">Case</option>
              <option value="gpu">GPU</option>
              <option value="cooler">Cooler</option>
              <option value="fan">Fan</option>
            </select>
            <select class="npc-chatbot-select" data-chatbot-component disabled>
              <option value="">Choose product</option>
            </select>
          </div>
          <div class="npc-chatbot-picker-preview" data-chatbot-picker-preview>
            Select a category to load products from the current catalog.
          </div>
          <div class="npc-chatbot-picker-actions">
            <button type="button" class="npc-chatbot-chip" data-action="apply-part">Add selected part</button>
            <button type="button" class="npc-chatbot-chip" data-action="hide-picker">Hide picker</button>
          </div>
        </div>
        <div class="npc-chatbot-log" data-chatbot-log></div>
        <form class="npc-chatbot-compose" data-chatbot-form>
          <input class="npc-chatbot-input" data-chatbot-input type="text" placeholder="Ask about parts, compatibility, or what to buy next" autocomplete="off" />
          <button class="npc-chatbot-send" data-chatbot-send type="submit">Send</button>
          <p class="npc-chatbot-footer" data-chatbot-status>Ready to help from any page.</p>
        </form>
      </aside>
    `;

    document.body.appendChild(root);
    return root;
  }

  function appendMessage(logEl, role, text, links = []) {
    const row = document.createElement('div');
    row.className = `npc-chatbot-row ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'npc-chatbot-bubble';
    bubble.textContent = text;

    if (links.length) {
      const linksWrap = document.createElement('div');
      linksWrap.className = 'npc-chatbot-links';
      links.forEach(link => {
        const anchor = document.createElement(link.href ? 'a' : 'button');
        anchor.className = 'npc-chatbot-mini-link';
        anchor.textContent = link.label;

        if (link.href) {
          anchor.href = link.href;
        } else {
          anchor.type = 'button';
          anchor.addEventListener('click', link.onClick);
        }

        linksWrap.appendChild(anchor);
      });
      bubble.appendChild(linksWrap);
    }

    row.appendChild(bubble);
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function formatMoney(amount) {
    return `${Number(amount || 0).toLocaleString()} VND`;
  }

  function buildLocalAdvice(parts, analysis) {
    const selected = selectedCategories(parts).length;
    const missingRequired = missingCategories(parts, true);

    if (!selected) {
      return {
        text: 'Your build is empty. Start with CPU, motherboard, RAM, then storage and PSU. After that, add the case and optional GPU or cooling based on budget.',
        links: [
          { label: 'Open builder', href: 'dashboard.html' },
          { label: 'Browse CPUs', href: 'products.html?category=cpu' },
        ],
      };
    }

    if (missingRequired.length) {
      const next = missingRequired[0];
      return {
        text: `You have ${selected}/9 categories selected. The most important next part is ${CATEGORY_LABELS[next]}. Finish all required parts before worrying about optional upgrades.`,
        links: [
          { label: `Browse ${CATEGORY_LABELS[next]}`, href: `products.html?category=${next}` },
          { label: 'Open builder', href: 'dashboard.html' },
        ],
      };
    }

    if (analysis && analysis.compatible === false) {
      const critical = Array.isArray(analysis.checks)
        ? analysis.checks.filter(check => check.status === 'fail').slice(0, 2)
        : [];
      const details = critical.map(check => `${check.title}: ${check.detail}`).join('\n');

      return {
        text: details
          ? `Your build needs fixes before checkout:\n${details}`
          : 'Your build has incompatibilities. Open the builder to adjust socket, RAM type, PSU headroom, or case clearances.',
        links: [
          { label: 'Fix in builder', href: 'dashboard.html' },
        ],
      };
    }

    const next = getNextCategory(parts);
    return {
      text: next
        ? `The required core is ready. To finish the build, add ${CATEGORY_LABELS[next]} next and then review cooling and GPU fit.`
        : 'Your build already looks complete. Run a review before checkout if you changed parts recently.',
      links: next
        ? [
            { label: `Browse ${CATEGORY_LABELS[next]}`, href: `products.html?category=${next}` },
            { label: 'Review in builder', href: 'dashboard.html' },
          ]
        : [
            { label: 'Open builder', href: 'dashboard.html' },
            { label: 'Go to cart', href: 'shopping-cart.html' },
          ],
    };
  }

  function createQuestionContext(snapshot, analysis, question) {
    const partLines = buildSummaryLines(snapshot.parts);
    const missingRequired = missingCategories(snapshot.parts, true);
    const keyChecks = Array.isArray(analysis?.checks)
      ? analysis.checks.slice(0, 5).map(check => `${check.status.toUpperCase()}: ${check.title} - ${check.detail}`)
      : [];

    return [
      `Trang hiện tại: ${getPageLabel()}`,
      `Tên build: ${snapshot.buildName || 'New Build'}`,
      `Linh kiện đã chọn: ${partLines.length ? partLines.join('; ') : 'Chưa có linh kiện nào.'}`,
      `Danh mục bắt buộc còn thiếu: ${missingRequired.length ? missingRequired.map(category => CATEGORY_LABELS[category]).join(', ') : 'Không thiếu.'}`,
      analysis
        ? `Compatibility: ${analysis.summary || 'No summary'} Score=${Number(analysis.score || 0)}`
        : 'Compatibility: chưa kiểm tra được.',
      keyChecks.length ? `Các check chính: ${keyChecks.join(' | ')}` : 'Các check chính: chưa có.',
      'Nếu phù hợp, hãy gợi ý danh mục nên thêm tiếp theo bằng tên category rõ ràng trong số: case, cpu, motherboard, gpu, ram, storage, psu, cooler, fan.',
      'Nếu câu hỏi là mua gì tiếp theo, hãy trả lời ngắn gọn và ưu tiên hành động tiếp theo trên website.',
      `Câu hỏi người dùng: ${question}`,
      'Hãy trả lời ngắn gọn, ưu tiên hướng dẫn thực tế để người dùng hoàn thiện một bộ PC phù hợp.',
    ].join('\n');
  }

  async function initWidget() {
    ensureStyles();
    const root = createRoot();
    const launchButton = root.querySelector('.npc-chatbot-launch');
    const closeButton = root.querySelector('.npc-chatbot-close');
    const badgeEl = root.querySelector('[data-chatbot-badge]');
    const buildTitleEl = root.querySelector('[data-chatbot-build-title]');
    const scoreEl = root.querySelector('[data-chatbot-score]');
    const progressEl = root.querySelector('[data-chatbot-progress]');
    const summaryEl = root.querySelector('[data-chatbot-summary]');
    const overviewEl = root.querySelector('[data-chatbot-overview]');
    const logEl = root.querySelector('[data-chatbot-log]');
    const formEl = root.querySelector('[data-chatbot-form]');
    const inputEl = root.querySelector('[data-chatbot-input]');
    const sendButton = root.querySelector('[data-chatbot-send]');
    const statusEl = root.querySelector('[data-chatbot-status]');
    const pickerEl = root.querySelector('[data-chatbot-picker]');
    const categorySelectEl = root.querySelector('[data-chatbot-category]');
    const componentSelectEl = root.querySelector('[data-chatbot-component]');
    const pickerPreviewEl = root.querySelector('[data-chatbot-picker-preview]');
    const focusToggleButton = root.querySelector('[data-chatbot-toggle-focus]');
    const actionButtons = Array.from(root.querySelectorAll('[data-action]'));

    const state = {
      initialized: false,
      snapshot: { buildName: 'New Build', parts: {} },
      analysis: null,
      busy: false,
      focusMode: false,
      selectedCategory: '',
      selectedComponentId: '',
      pickerComponents: [],
    };

    function setBusy(isBusy, statusText) {
      state.busy = isBusy;
      inputEl.disabled = isBusy;
      sendButton.disabled = isBusy;
      actionButtons.forEach(button => {
        button.disabled = isBusy;
      });

      if (statusText) {
        statusEl.textContent = statusText;
      }
    }

    function syncFocusUi() {
      root.classList.toggle('is-focus', state.focusMode);
      focusToggleButton.textContent = state.focusMode ? 'Show' : 'Focus';
      focusToggleButton.setAttribute('aria-pressed', String(state.focusMode));
    }

    function renderPickerPreview(message) {
      pickerPreviewEl.textContent = message;
    }

    function resetPickerSelections() {
      state.selectedComponentId = '';
      state.pickerComponents = [];
      componentSelectEl.innerHTML = '<option value="">Choose product</option>';
      componentSelectEl.disabled = true;
      renderPickerPreview('Select a category to load products from the current catalog.');
    }

    function togglePicker(shouldOpen) {
      pickerEl.classList.toggle('is-open', shouldOpen);
      if (!shouldOpen) {
        categorySelectEl.value = '';
        state.selectedCategory = '';
        resetPickerSelections();
      }
    }

    function renderComponentOptions(components) {
      componentSelectEl.innerHTML = '<option value="">Choose product</option>';

      components.forEach(component => {
        const option = document.createElement('option');
        option.value = String(component._id || '');
        option.textContent = `${component.name} • ${formatMoney(component.price)}`;
        componentSelectEl.appendChild(option);
      });

      componentSelectEl.disabled = components.length === 0;
    }

    async function loadCategoryComponents(category) {
      state.selectedCategory = category;
      state.selectedComponentId = '';
      renderPickerPreview('Loading catalog...');
      componentSelectEl.disabled = true;
      componentSelectEl.innerHTML = '<option value="">Loading products...</option>';

      try {
        const components = await fetchComponentsByCategory(category);
        state.pickerComponents = components;
        renderComponentOptions(components);

        if (!components.length) {
          renderPickerPreview(`No products found for ${CATEGORY_LABELS[category]}.`);
          return;
        }

        renderPickerPreview(`Loaded ${components.length} product(s) for ${CATEGORY_LABELS[category]}. Pick one to add it directly into the current build.`);
      } catch (error) {
        state.pickerComponents = [];
        componentSelectEl.innerHTML = '<option value="">Choose product</option>';
        componentSelectEl.disabled = true;
        renderPickerPreview(error.message);
      }
    }

    function updatePickerDetails() {
      const selectedComponent = state.pickerComponents.find(component => String(component._id || '') === state.selectedComponentId);
      if (!selectedComponent) {
        renderPickerPreview('Choose a product to preview its name, brand, and price before adding it into the build.');
        return;
      }

      renderPickerPreview(
        [
          `${selectedComponent.name}`,
          `${selectedComponent.brand || 'Generic'} • ${formatMoney(selectedComponent.price)}`,
          selectedComponent.description ? String(selectedComponent.description).slice(0, 120) : 'Ready to add this component into the current build.',
        ].join('\n')
      );
    }

    async function applySelectedComponent() {
      const selectedComponent = state.pickerComponents.find(component => String(component._id || '') === state.selectedComponentId);
      if (!selectedComponent || !state.selectedCategory) {
        renderPickerPreview('Pick both a category and a product first.');
        return;
      }

      if (typeof window.getBuild !== 'function' || typeof window.saveBuild !== 'function') {
        renderPickerPreview('Build helpers are not ready on this page yet.');
        return;
      }

      setBusy(true, 'Adding selected part into the current build...');

      try {
        const currentBuild = await getBuildSnapshot();
        const nextBuild = { ...currentBuild.parts };
        nextBuild[state.selectedCategory] = normalizeComponentForBuild(selectedComponent, state.selectedCategory);
        await window.saveBuild(nextBuild);
        await refreshState();
        appendMessage(
          logEl,
          'system',
          `${selectedComponent.name} has been added to ${CATEGORY_LABELS[state.selectedCategory]} in your current build.`,
          [
            { label: 'Open builder', href: 'dashboard.html' },
          ]
        );
        if (typeof window.showPopup === 'function') {
          window.showPopup(`${selectedComponent.name} added to build`);
        }
        statusEl.textContent = `${selectedComponent.name} added successfully.`;
      } catch (error) {
        renderPickerPreview(error.message || 'Failed to add selected component.');
      } finally {
        setBusy(false);
      }
    }

    function renderOverview() {
      const selected = selectedCategories(state.snapshot.parts).length;
      const missingRequired = missingCategories(state.snapshot.parts, true);
      const preview = buildPreviewText(state.snapshot.parts);
      const completionRate = Math.round((selected / Object.keys(CATEGORY_LABELS).length) * 100);

      badgeEl.textContent = preview.badge;
      buildTitleEl.textContent = state.snapshot.buildName || 'New Build';
      progressEl.style.width = `${completionRate}%`;

      if (!selected) {
        scoreEl.textContent = 'No build data yet';
        summaryEl.textContent = 'No components selected. Ask for a starter build or open the builder to begin.';
        return;
      }

      if (state.analysis) {
        const warnings = Array.isArray(state.analysis.checks)
          ? state.analysis.checks.filter(check => check.status === 'warn').length
          : 0;
        scoreEl.textContent = `Compatibility ${Number(state.analysis.score || 0)}/100${warnings ? ` • ${warnings} warning${warnings > 1 ? 's' : ''}` : ''}`;
        summaryEl.textContent = state.analysis.summary || 'Compatibility checked successfully.';
        return;
      }

      summaryEl.textContent = missingRequired.length
        ? `Missing required parts: ${missingRequired.map(category => CATEGORY_LABELS[category]).join(', ')}.`
        : 'Core build is present. Run a review to check socket, RAM, PSU and clearances.';
      scoreEl.textContent = `${selected}/9 categories selected`;
    }

    async function refreshState() {
      state.snapshot = await getBuildSnapshot();
      state.analysis = await fetchCompatibility(state.snapshot.parts);
      renderOverview();
      return state;
    }

    async function handleQuickAction(action) {
      await refreshState();

      if (action === 'pick') {
        const willOpen = !pickerEl.classList.contains('is-open');
        togglePicker(willOpen);
        statusEl.textContent = willOpen
          ? 'Part picker opened. Choose category then product.'
          : 'Part picker hidden.';
        return;
      }

      if (action === 'next') {
        const nextCategory = getNextCategory(state.snapshot.parts);
        if (!nextCategory) {
          appendMessage(
            logEl,
            'system',
            'Your build already has every category filled. I would review compatibility one more time and then proceed to cart or checkout.',
            [
              { label: 'Open builder', href: 'dashboard.html' },
              { label: 'Go to cart', href: 'shopping-cart.html' },
            ]
          );
          statusEl.textContent = 'Build is already complete.';
          return;
        }

        appendMessage(
          logEl,
          'system',
          `The next best step is ${CATEGORY_LABELS[nextCategory]}. Pick that part first, then I can re-check the build and suggest what to do after it.`,
          [
            { label: `Browse ${CATEGORY_LABELS[nextCategory]}`, href: `products.html?category=${nextCategory}` },
            { label: 'Open builder', href: 'dashboard.html' },
          ]
        );
        statusEl.textContent = `Suggested next category: ${CATEGORY_LABELS[nextCategory]}.`;
        return;
      }

      if (action === 'apply-part') {
        await applySelectedComponent();
        return;
      }

      if (action === 'hide-picker') {
        togglePicker(false);
        statusEl.textContent = 'Part picker hidden.';
        return;
      }

      if (action === 'builder') {
        window.location.href = 'dashboard.html';
      }
    }

    async function askGemini(question) {
      await refreshState();
      const contextualQuestion = createQuestionContext(state.snapshot, state.analysis, question);

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: contextualQuestion }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Gemini error ${response.status}`);
      }

      return payload.answer || 'No response from Gemini.';
    }

    launchButton.addEventListener('click', async () => {
      const isOpen = root.classList.toggle('is-open');
      launchButton.setAttribute('aria-expanded', String(isOpen));

      if (isOpen) {
        await refreshState();
        inputEl.focus();
      }
    });

    closeButton.addEventListener('click', () => {
      root.classList.remove('is-open');
      launchButton.setAttribute('aria-expanded', 'false');
    });

    focusToggleButton.addEventListener('click', () => {
      state.focusMode = !state.focusMode;
      syncFocusUi();
      statusEl.textContent = state.focusMode
        ? 'Focus mode enabled. Current build panel and quick actions are hidden.'
        : 'Focus mode disabled. Current build panel is visible again.';
    });

    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        handleQuickAction(button.dataset.action);
      });
    });

    categorySelectEl.addEventListener('change', async () => {
      const category = categorySelectEl.value;
      if (!category) {
        state.selectedCategory = '';
        resetPickerSelections();
        return;
      }

      await loadCategoryComponents(category);
    });

    componentSelectEl.addEventListener('change', () => {
      state.selectedComponentId = componentSelectEl.value;
      updatePickerDetails();
    });

    formEl.addEventListener('submit', async event => {
      event.preventDefault();
      const question = inputEl.value.trim();
      if (!question || state.busy) {
        return;
      }

      appendMessage(logEl, 'user', question);
      inputEl.value = '';
      setBusy(true, 'Checking build context and sending to Gemini...');

      try {
        const answer = await askGemini(question);
        appendMessage(logEl, 'bot', answer, [
          { label: 'Open builder', href: 'dashboard.html' },
          { label: 'Browse parts', href: 'products.html' },
          { label: 'Add part to build', onClick: () => handleQuickAction('pick') },
        ]);
        statusEl.textContent = 'Reply received.';
      } catch (error) {
        const fallback = buildLocalAdvice(state.snapshot.parts, state.analysis);
        appendMessage(
          logEl,
          'bot',
          `Gemini is unavailable right now, so I switched to local guidance.\n\n${fallback.text}`,
          fallback.links
        );
        statusEl.textContent = error.message;
      } finally {
        setBusy(false);
        inputEl.focus();
      }
    });

    await refreshState();
    syncFocusUi();

    window.addEventListener('npc:build-changed', async () => {
      await refreshState();
    });

    if (!state.initialized) {
      const advice = buildLocalAdvice(state.snapshot.parts, state.analysis);
      appendMessage(logEl, 'system', advice.text, advice.links);
      state.initialized = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();