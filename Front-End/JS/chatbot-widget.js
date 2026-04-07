/**
 * Floating AI Chatbot Widget — NPC Breaking Bad Builder
 * - Click the circular FAB to open/close the panel (no persistent header)
 * - Build tracker section with progress bar + slot indicators
 * - "Add to Build" buttons parsed from AI responses
 * - Dark / Light theme follows body.bg-dark
 */

(function () {
  if (window.__npcChatbotWidgetInitialized) return;
  window.__npcChatbotWidgetInitialized = true;

  const API_URL        = 'http://127.0.0.1:3001/api/gemini';
  const COMP_API_URL   = 'http://127.0.0.1:3001/api/components';
  const BUILD_CATS     = ['case','cpu','motherboard','gpu','ram','storage','psu','cooler','fan'];
  const CAT_LABELS     = { case:'Case', cpu:'CPU', motherboard:'MB', gpu:'GPU', ram:'RAM', storage:'SSD/HDD', psu:'PSU', cooler:'Cooler', fan:'Fan' };
  const HISTORY_KEY    = 'npc_cb_history';
  const CHATBOT_STYLE_ID = 'npc-chatbot-style-link';

  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function saveHistory(arr) {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }
    catch {} // ignore quota errors
  }

  // ── CSS ─────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById(CHATBOT_STYLE_ID)) return;

    const styleLink = document.createElement('link');
    styleLink.id = CHATBOT_STYLE_ID;
    styleLink.rel = 'stylesheet';
    styleLink.href = 'CSS/chatbot-widget.css';
    document.head.appendChild(styleLink);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function safeEscape(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Render markdown-ish text into a .cb-bubble element
  function renderMarkdown(text) {
    const el = document.createElement('div');
    el.className = 'cb-bubble';
    text.split('\n').forEach((line, i) => {
      if (i > 0) el.appendChild(document.createElement('br'));
      const isBullet = /^[\-\*•]\s/.test(line.trim());
      const raw = isBullet ? line.replace(/^[\-\*•]\s+/,'') : line;
      const span = document.createElement('span');
      if (isBullet) span.className = 'cb-bullet';
      span.innerHTML = raw
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/\*(.+?)\*/g,'<em>$1</em>');
      el.appendChild(span);
    });
    return el;
  }

  // Parse "Name | Price | Reason" lines from bot response
  function parseProductLines(text) {
    const results = [];
    text.split('\n').forEach(line => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length >= 2) {
        const name = parts[0].replace(/^[\-\*•]+\s*/, '').replace(/\*\*/g,'').trim();
        if (name.length > 3 && name.length < 120 && /[a-zA-Z0-9]/.test(name)) {
          results.push(name);
        }
      }
    });
    return [...new Set(results)]; // deduplicate
  }

  // Search component by name from the API
  async function resolveComponent(name) {
    const encodedName = encodeURIComponent(name.substring(0, 60));
    const res = await fetch(`${COMP_API_URL}?search=${encodedName}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.components || data.items || []);
    if (!items.length) return null;
    // prefer exact or closest match
    return items.find(c => c.name.toLowerCase().includes(name.substring(0,15).toLowerCase())) || items[0];
  }

  // Add a component to the build (works on any page via app.js globals)
  async function addComponentToBuild(component) {
    if (!component) return false;
    const category = component.category;
    if (!category) return false;

    // Dashboard: use dedicated realtime API exposed by dashboard.js
    if (typeof window.chatbotAddComponent === 'function') {
      const ok = await window.chatbotAddComponent(component);
      if (ok) refreshTracker();
      return ok;
    }

    // Other pages: use app.js global build API
    if (typeof window.saveBuild === 'function' && typeof window.getBuild === 'function') {
      const build = window.getBuild();
      build[category] = {
        _id:      component._id,
        category: component.category,
        name:     component.name,
        price:    component.price,
        power:    component.power || 0,
        brand:    component.brand || '',
        imageUrl: component.imageUrl || '',
      };
      await window.saveBuild(build);
      refreshTracker();
      return true;
    }

    return false;
  }

  // ── Build Tracker ─────────────────────────────────────────────────────────

  function getCurrentBuild() {
    if (typeof window.currentBuild !== 'undefined') return window.currentBuild;
    if (typeof window.getBuild === 'function') return window.getBuild();
    if (window.commerceState?.build) return window.commerceState.build;
    return null;
  }

  function refreshTracker() {
    const build = getCurrentBuild();
    const nameEl  = document.getElementById('cb-tracker-name');
    const fillEl  = document.getElementById('cb-progress-fill');
    const metaEl  = document.getElementById('cb-tracker-meta');
    const priceEl = document.getElementById('cb-tracker-price');
    const slotsEl = document.getElementById('cb-slots');
    if (!nameEl || !slotsEl) return;

    const buildName = (typeof window.getBuildName === 'function' ? window.getBuildName() : null)
      || window.commerceState?.buildName
      || 'New Build';
    nameEl.textContent = buildName;

    if (!build) {
      fillEl.style.width = '0%';
      metaEl.textContent = '0/9 parts';
      priceEl.textContent = '0 ₫';
      slotsEl.innerHTML = BUILD_CATS.map(cat =>
        `<div class="cb-slot" title="${CAT_LABELS[cat]}">
           <div class="cb-slot-dot"></div>
           <span class="cb-slot-name">${CAT_LABELS[cat]}</span>
         </div>`
      ).join('');
      return;
    }

    let filled = 0;
    let totalPrice = 0;
    const slotHTML = BUILD_CATS.map(cat => {
      const part = build[cat];
      const hasPart = !!(part && part.name);
      if (hasPart) { filled++; totalPrice += Number(part.price || 0); }
      return `<div class="cb-slot ${hasPart ? 'filled' : ''}" title="${hasPart ? part.name : CAT_LABELS[cat]}">
                <div class="cb-slot-dot"></div>
                <span class="cb-slot-name">${CAT_LABELS[cat]}</span>
              </div>`;
    }).join('');

    const pct = Math.round((filled / BUILD_CATS.length) * 100);
    fillEl.style.width = `${pct}%`;
    metaEl.textContent = `${filled}/9 parts`;
    priceEl.textContent = totalPrice.toLocaleString('vi-VN') + ' ₫';
    slotsEl.innerHTML = slotHTML;
  }

  // ── Build widget DOM ─────────────────────────────────────────────────────

  function buildWidget() {
    // circular FAB
    const fab = document.createElement('button');
    fab.id = 'cb-fab';
    fab.title = 'AI PC Assistant';
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>`;
    document.body.appendChild(fab);

    // panel
    const panel = document.createElement('div');
    panel.id = 'cb-panel';
    panel.innerHTML = `
      <div id="cb-topbar">
        <span id="cb-topbar-label">🤖 AI PC Assistant</span>
        <button id="cb-close" title="Close">✕</button>
      </div>

      <div id="cb-tracker">
        <div id="cb-tracker-header">
          <span id="cb-tracker-name">New Build</span>
          <div>
            <div id="cb-tracker-meta" style="font-size:.72rem;color:var(--cb-muted);text-align:right">0/9 parts</div>
            <div id="cb-tracker-price">0 ₫</div>
          </div>
        </div>
        <div id="cb-progress-wrap">
          <div id="cb-progress-fill"></div>
        </div>
        <div id="cb-slots"></div>
      </div>

      <div id="cb-window"></div>
      <div id="cb-suggestions"></div>
      <p id="cb-status">Ask me about PC components or builds.</p>
      <div id="cb-input-bar">
        <input id="cb-input" type="text"
               placeholder="e.g. CPU for gaming under 8 million…" autocomplete="off" />
        <button id="cb-send">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Send
        </button>
      </div>
    `;
    document.body.appendChild(panel);
    return { fab, panel };
  }

  // ── Suggestion chips ──────────────────────────────────────────────────────

  const DEFAULT_SUGGESTIONS = [
    'Best CPU for gaming under 10M ₫',
    'GPU for 1080p on a budget',
    'Suggest a full gaming build',
    'Compatible motherboard for i7-13700K',
  ];

  // ── Wire up logic ─────────────────────────────────────────────────────────

  function setupChatbot(fab, panel) {
    const windowEl  = document.getElementById('cb-window');
    const inputEl   = document.getElementById('cb-input');
    const sendBtn   = document.getElementById('cb-send');
    const statusEl  = document.getElementById('cb-status');
    const closeBtn  = document.getElementById('cb-close');
    const suggestEl = document.getElementById('cb-suggestions');

    let isOpen = false;
    let chatHistory = loadHistory();

    function open() {
      isOpen = true;
      panel.classList.add('cb-open');
      fab.classList.add('open');
      fab.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      refreshTracker();
      if (windowEl.children.length === 0) {
        if (chatHistory.length > 0) restoreFromHistory();
        else renderSuggestions();
      }
      setTimeout(() => inputEl.focus(), 100);
    }

    function close() {
      isOpen = false;
      panel.classList.remove('cb-open');
      fab.classList.remove('open');
      fab.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    }

    fab.addEventListener('click', () => isOpen ? close() : open());
    closeBtn.addEventListener('click', close);

    // ── Suggestions ──
    function renderSuggestions() {
      suggestEl.innerHTML = '';
      DEFAULT_SUGGESTIONS.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'cb-chip';
        chip.textContent = text;
        chip.addEventListener('click', () => {
          inputEl.value = text;
          suggestEl.innerHTML = '';
          sendMessage();
        });
        suggestEl.appendChild(chip);
      });
    }

    // ── History restore ──
    function restoreFromHistory() {
      suggestEl.innerHTML = '';
      chatHistory.forEach((entry, idx) => {
        if (entry.role === 'user') {
          const b = document.createElement('div');
          b.className = 'cb-bubble';
          b.textContent = entry.text;
          appendMessage(b, 'user');
        } else if (entry.role === 'bot') {
          const b = renderMarkdown(entry.text);
          const grp = (entry.productNames && entry.productNames.length)
            ? buildAddGroup(entry.productNames, entry.addedNames || [], idx)
            : null;
          appendMessage(b, 'bot', grp);
        }
      });
      statusEl.textContent = 'Ask another question.';
    }

    // ── Message rendering ──
    function appendMessage(bubbleEl, role, addGroupEl) {
      const wrap = document.createElement('div');
      wrap.className = `cb-msg ${role}`;

      const avatar = document.createElement('div');
      avatar.className = 'cb-avatar';
      avatar.textContent = role === 'user' ? '🧑' : '🤖';

      const bubbleWrap = document.createElement('div');
      bubbleWrap.className = 'cb-bubble-wrap';
      bubbleWrap.appendChild(bubbleEl);
      if (addGroupEl) bubbleWrap.appendChild(addGroupEl);

      wrap.appendChild(avatar);
      wrap.appendChild(bubbleWrap);
      windowEl.appendChild(wrap);
      windowEl.scrollTop = windowEl.scrollHeight;
    }

    function showTyping() {
      const wrap = document.createElement('div');
      wrap.className = 'cb-msg bot';
      wrap.id = 'cb-typing-indicator';
      const avatar = document.createElement('div');
      avatar.className = 'cb-avatar';
      avatar.textContent = '🤖';
      const d = document.createElement('div');
      d.className = 'cb-typing';
      d.innerHTML = '<div class="cb-dot"></div><div class="cb-dot"></div><div class="cb-dot"></div>';
      wrap.appendChild(avatar);
      wrap.appendChild(d);
      windowEl.appendChild(wrap);
      windowEl.scrollTop = windowEl.scrollHeight;
    }
    function removeTyping() {
      const el = document.getElementById('cb-typing-indicator');
      if (el) el.remove();
    }

    // ── Add-to-Build buttons ──
    function buildAddGroup(productNames, addedNames, histIdx) {
      if (!productNames.length) return null;
      const group = document.createElement('div');
      group.className = 'cb-add-group';
      const added = Array.isArray(addedNames) ? addedNames : [];

      productNames.slice(0, 4).forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'cb-add-btn';
        btn.title = name;

        if (added.includes(name)) {
          // Already added in a previous session — show as done
          btn.classList.add('cb-added');
          btn.disabled = true;
          btn.textContent = `✓ Added: ${name}`;
        } else {
          btn.innerHTML = `➕ Add to Build: <em style="margin-left:4px;font-style:normal;font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle;">${safeEscape(name)}</em>`;

          btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Searching…';
            try {
              const comp = await resolveComponent(name);
              if (!comp) { btn.textContent = '❌ Not found in catalog'; btn.disabled = false; return; }
              const ok = await addComponentToBuild(comp);
              if (ok) {
                btn.classList.add('cb-added');
                btn.textContent = `✓ Added: ${comp.name} (${comp.category})`;
                // Persist added state in history
                if (histIdx !== undefined && chatHistory[histIdx]) {
                  (chatHistory[histIdx].addedNames = chatHistory[histIdx].addedNames || []).push(name);
                  saveHistory(chatHistory);
                }
                if (typeof window.showPopup === 'function') {
                  window.showPopup(`${comp.name} added to build!`);
                }
              } else {
                btn.textContent = '❌ Cannot add — open dashboard first';
                btn.disabled = false;
              }
            } catch {
              btn.textContent = '❌ Error adding component';
              btn.disabled = false;
            }
          });
        }

        group.appendChild(btn);
      });

      return group;
    }

    // ── Send ──
    async function sendMessage() {
      const question = inputEl.value.trim();
      if (!question) return;

      suggestEl.innerHTML = '';

      // Append user message and save to history
      const userBubble = document.createElement('div');
      userBubble.className = 'cb-bubble';
      userBubble.textContent = question;
      appendMessage(userBubble, 'user');
      chatHistory.push({ role: 'user', text: question });
      saveHistory(chatHistory);

      inputEl.value = '';
      inputEl.disabled = true;
      sendBtn.disabled = true;
      statusEl.textContent = 'Gemini is thinking…';
      showTyping();

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });

        const rawText = await res.text();
        let payload;
        try { payload = rawText ? JSON.parse(rawText) : {}; }
        catch { throw new Error(`Unexpected server response (${res.status})`); }

        if (!res.ok) throw new Error(payload.error || `Error ${res.status}`);

        removeTyping();

        const answer = payload.answer || 'No response.';
        const botBubble = renderMarkdown(answer);

        // Parse product suggestions, save bot message to history, create Add buttons
        const productNames = parseProductLines(answer);
        const histIdx = chatHistory.length;
        chatHistory.push({ role: 'bot', text: answer, productNames, addedNames: [] });
        saveHistory(chatHistory);

        const addGroup = productNames.length ? buildAddGroup(productNames, [], histIdx) : null;
        appendMessage(botBubble, 'bot', addGroup);
        statusEl.textContent = 'Ask another question.';
        refreshTracker();
      } catch (err) {
        removeTyping();
        const errBubble = document.createElement('div');
        errBubble.className = 'cb-bubble';
        errBubble.textContent = '⚠ ' + err.message;
        appendMessage(errBubble, 'bot');
        statusEl.textContent = 'Something went wrong.';
        console.error('[Chatbot]', err);
      } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Refresh tracker whenever build state changes externally
    window.addEventListener('buildStateChanged', refreshTracker);
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    injectCSS();
    const { fab, panel } = buildWidget();
    setupChatbot(fab, panel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
