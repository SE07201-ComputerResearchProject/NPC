/**
 * Floating AI Chatbot Widget — NPC Breaking Bad Builder
 * - Click the circular FAB to open/close the panel (no persistent header)
 * - Build tracker section with progress bar + slot indicators
 * - "Add to Build" buttons parsed from AI responses
 * - Dark / Light theme follows body.bg-dark
 */

(function () {
  const API_URL        = 'http://127.0.0.1:3001/api/gemini';
  const COMP_API_URL   = 'http://127.0.0.1:3001/api/components';
  const BUILD_CATS     = ['case','cpu','motherboard','gpu','ram','storage','psu','cooler','fan'];
  const CAT_LABELS     = { case:'Case', cpu:'CPU', motherboard:'MB', gpu:'GPU', ram:'RAM', storage:'SSD/HDD', psu:'PSU', cooler:'Cooler', fan:'Fan' };
  const HISTORY_KEY    = 'npc_cb_history';

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
    const style = document.createElement('style');
    style.textContent = `
      /* ─ CSS Variables (light default) ─ */
      #cb-panel {
        --cb-accent:      #3d6bff;
        --cb-accent-h:    #2c55d8;
        --cb-bg:          #ffffff;
        --cb-bg-win:      #f4f6ff;
        --cb-bg-bar:      #eef0fb;
        --cb-bg-tracker:  #eef1ff;
        --cb-border:      rgba(0,0,0,0.09);
        --cb-shadow:      0 12px 40px rgba(44,67,120,0.20);
        --cb-text:        #1a2540;
        --cb-muted:       #6272a4;
        --cb-user-bg:     #3d6bff;
        --cb-user-txt:    #ffffff;
        --cb-bot-bg:      #e6ecff;
        --cb-bot-txt:     #1a2540;
        --cb-slot-on:     #22c55e;
        --cb-slot-off:    #d1d5db;
        --cb-progress-bg: rgba(0,0,0,0.08);
      }
      body.bg-dark #cb-panel {
        --cb-accent:      #6ea8fe;
        --cb-accent-h:    #518cf0;
        --cb-bg:          #1a1a2e;
        --cb-bg-win:      #13132a;
        --cb-bg-bar:      #1c1c36;
        --cb-bg-tracker:  #1e1e3a;
        --cb-border:      rgba(255,255,255,0.09);
        --cb-shadow:      0 12px 40px rgba(0,0,0,0.60);
        --cb-text:        #dce3ff;
        --cb-muted:       #7b8ab8;
        --cb-user-bg:     #3b5bcc;
        --cb-user-txt:    #f0f4ff;
        --cb-bot-bg:      #252550;
        --cb-bot-txt:     #dce3ff;
        --cb-slot-on:     #4ade80;
        --cb-slot-off:    #374151;
        --cb-progress-bg: rgba(255,255,255,0.08);
      }

      /* ─ FAB ─ */
      #cb-fab {
        position: fixed;
        bottom: 26px;
        right: 24px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #3d6bff;
        color: #fff;
        border: none;
        box-shadow: 0 4px 18px rgba(61,107,255,0.45);
        font-size: 22px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: transform 0.22s, box-shadow 0.22s, background 0.22s;
        outline: none;
      }
      body.bg-dark #cb-fab {
        background: #6ea8fe;
        box-shadow: 0 4px 18px rgba(110,168,254,0.38);
      }
      #cb-fab:hover { transform: scale(1.12); box-shadow: 0 6px 26px rgba(61,107,255,0.55); }
      #cb-fab.open { background: #1a2540; }
      body.bg-dark #cb-fab.open { background: #252550; }

      /* ─ Panel ─ */
      #cb-panel {
        position: fixed;
        bottom: 88px;
        right: 24px;
        width: 360px;
        max-height: 600px;
        border-radius: 16px;
        border: 1px solid var(--cb-border);
        box-shadow: var(--cb-shadow);
        background: var(--cb-bg);
        display: flex;
        flex-direction: column;
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13.5px;
        z-index: 9998;
        overflow: hidden;
        color: var(--cb-text);
        /* Animation */
        opacity: 0;
        transform: translateY(12px) scale(0.97);
        pointer-events: none;
        transition: opacity 0.22s ease, transform 0.22s cubic-bezier(.4,0,.2,1);
      }
      #cb-panel.cb-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }

      /* ─ Panel top bar (no title, just close btn) ─ */
      #cb-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px 6px;
        background: var(--cb-bg);
        flex-shrink: 0;
        border-bottom: 1px solid var(--cb-border);
      }
      #cb-topbar-label {
        font-size: 0.78rem;
        color: var(--cb-muted);
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      #cb-close {
        background: none;
        border: none;
        color: var(--cb-muted);
        font-size: 18px;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 6px;
        line-height: 1;
        transition: color 0.15s, background 0.15s;
      }
      #cb-close:hover { background: var(--cb-progress-bg); color: var(--cb-text); }

      /* ─ Build Tracker ─ */
      #cb-tracker {
        background: var(--cb-bg-tracker);
        border-bottom: 1px solid var(--cb-border);
        padding: 10px 14px;
        flex-shrink: 0;
      }
      #cb-tracker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      #cb-tracker-name {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--cb-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 180px;
      }
      #cb-tracker-meta {
        font-size: 0.75rem;
        color: var(--cb-muted);
        text-align: right;
      }
      #cb-tracker-price {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--cb-accent);
      }
      /* Progress bar */
      #cb-progress-wrap {
        height: 5px;
        background: var(--cb-progress-bg);
        border-radius: 99px;
        margin-bottom: 8px;
        overflow: hidden;
      }
      #cb-progress-fill {
        height: 100%;
        background: var(--cb-accent);
        border-radius: 99px;
        transition: width 0.4s ease;
        width: 0%;
      }
      /* Slot grid */
      #cb-slots {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        gap: 3px;
      }
      .cb-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        cursor: default;
      }
      .cb-slot-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--cb-slot-off);
        transition: background 0.25s;
      }
      .cb-slot.filled .cb-slot-dot { background: var(--cb-slot-on); }
      .cb-slot-name {
        font-size: 0.58rem;
        color: var(--cb-muted);
        text-align: center;
        line-height: 1.1;
      }
      .cb-slot.filled .cb-slot-name { color: var(--cb-slot-on); }

      /* ─ Message window ─ */
      #cb-window {
        flex: 1;
        overflow-y: auto;
        padding: 12px 12px 6px;
        background: var(--cb-bg-win);
        display: flex;
        flex-direction: column;
        gap: 8px;
        scroll-behavior: smooth;
        min-height: 0;
      }
      #cb-window::-webkit-scrollbar { width: 4px; }
      #cb-window::-webkit-scrollbar-thumb { background: var(--cb-muted); border-radius: 4px; opacity:.4; }

      /* ─ Messages ─ */
      .cb-msg { display:flex; align-items:flex-end; gap:7px; max-width:94%; }
      .cb-msg.user { align-self:flex-end; flex-direction:row-reverse; }
      .cb-msg.bot  { align-self:flex-start; }
      .cb-avatar {
        width:26px; height:26px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:13px; flex-shrink:0;
        background:var(--cb-bg); border:1px solid var(--cb-border);
      }
      .cb-bubble-wrap { display:flex; flex-direction:column; gap:4px; max-width:100%; }
      .cb-bubble {
        padding:8px 12px; border-radius:13px;
        line-height:1.5; word-break:break-word; white-space:pre-wrap;
      }
      .cb-msg.user .cb-bubble {
        background:var(--cb-user-bg); color:var(--cb-user-txt);
        border-bottom-right-radius:3px;
      }
      .cb-msg.bot .cb-bubble {
        background:var(--cb-bot-bg); color:var(--cb-bot-txt);
        border-bottom-left-radius:3px;
      }
      .cb-bubble strong { font-weight:700; }
      .cb-bubble em     { font-style:italic; }
      .cb-bullet { display:block; padding-left:13px; position:relative; }
      .cb-bullet::before { content:'•'; position:absolute; left:0; }

      /* ─ Add to Build buttons inside messages ─ */
      .cb-add-group {
        display:flex; flex-direction:column; gap:4px;
        padding:6px 2px 2px;
      }
      .cb-add-btn {
        display:inline-flex; align-items:center; gap:6px;
        padding:5px 10px;
        border-radius:8px;
        border:1px solid var(--cb-accent);
        background:transparent;
        color:var(--cb-accent);
        font-size:0.76rem; font-weight:600;
        cursor:pointer;
        transition:background .15s, color .15s;
        width:fit-content;
        max-width:100%;
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .cb-add-btn:hover { background:var(--cb-accent); color:#fff; }
      .cb-add-btn:disabled { opacity:.5; cursor:not-allowed; }
      .cb-add-btn.cb-added { background:var(--cb-slot-on); border-color:var(--cb-slot-on); color:#fff; }

      /* ─ Typing indicator ─ */
      .cb-typing {
        display:flex; gap:4px; padding:9px 12px;
        background:var(--cb-bot-bg); border-radius:13px;
        border-bottom-left-radius:3px; width:fit-content;
      }
      .cb-dot {
        width:6px; height:6px; border-radius:50%;
        background:var(--cb-muted);
        animation:cbBounce 1.2s infinite ease-in-out;
      }
      .cb-dot:nth-child(2){ animation-delay:.18s; }
      .cb-dot:nth-child(3){ animation-delay:.36s; }
      @keyframes cbBounce {
        0%,80%,100%{ transform:scale(0.7); opacity:.5; }
        40%        { transform:scale(1);   opacity:1;  }
      }

      /* ─ Suggestions ─ */
      #cb-suggestions {
        display:flex; flex-wrap:wrap; gap:5px;
        padding:7px 12px 4px;
        background:var(--cb-bg-win);
        flex-shrink:0;
      }
      .cb-chip {
        padding:4px 10px; border-radius:20px;
        border:1px solid var(--cb-accent); color:var(--cb-accent);
        background:transparent; font-size:0.75rem;
        cursor:pointer; transition:background .15s, color .15s;
        white-space:nowrap;
      }
      .cb-chip:hover { background:var(--cb-accent); color:#fff; }

      /* ─ Status ─ */
      #cb-status {
        font-size:0.72rem; color:var(--cb-muted);
        text-align:center; padding:3px 10px;
        background:var(--cb-bg-win); margin:0; flex-shrink:0;
      }

      /* ─ Input bar ─ */
      #cb-input-bar {
        display:grid; grid-template-columns:1fr auto;
        gap:7px; padding:9px 12px;
        background:var(--cb-bg-bar);
        border-top:1px solid var(--cb-border);
        flex-shrink:0;
      }
      #cb-input {
        border:1px solid var(--cb-border);
        border-radius:9px; padding:8px 11px;
        font-size:0.86rem;
        background:var(--cb-bg); color:var(--cb-text);
        outline:none; width:100%;
        transition:border-color .15s;
      }
      #cb-input::placeholder { color:var(--cb-muted); }
      #cb-input:focus { border-color:var(--cb-accent); }
      #cb-send {
        background:var(--cb-accent); color:#fff;
        border:none; border-radius:9px;
        padding:0 13px; font-weight:700; font-size:0.84rem;
        cursor:pointer; display:flex; align-items:center; gap:5px;
        transition:background .15s, transform .1s;
        white-space:nowrap;
      }
      #cb-send:hover:not(:disabled) { background:var(--cb-accent-h); transform:translateY(-1px); }
      #cb-send:disabled { opacity:.5; cursor:not-allowed; transform:none; }

      /* ─ Mobile ─ */
      @media (max-width:480px){
        #cb-panel { width:calc(100vw - 20px); right:10px; bottom:86px; }
        #cb-fab   { right:14px; }
      }
    `;
    document.head.appendChild(style);
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
