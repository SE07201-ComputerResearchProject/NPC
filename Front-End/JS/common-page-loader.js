(function () {
  const body = document.body;
  if (!body) return;

  const vendorScripts = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
    'https://unpkg.com/lucide@latest',
  ];

  const extraVendorScripts = String(body.dataset.vendorScripts || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  const pageScript = String(body.dataset.pageScript || '').trim();
  const enableChatbot = body.dataset.enableChatbot !== 'false';

  const scriptQueue = [
    ...vendorScripts,
    ...extraVendorScripts,
    'JS/app.js',
    'JS/components-menu.js',
    'JS/auth-popup.js?v=2',
  ];

  if (pageScript) {
    scriptQueue.push(pageScript);
  }

  if (enableChatbot) {
    scriptQueue.push('JS/chatbot-widget.js');
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  async function bootstrapPage() {
    for (const src of scriptQueue) {
      await loadScript(src);
    }

    if (document.readyState !== 'loading') {
      document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  bootstrapPage().catch(error => {
    console.error('Page bootstrap failed:', error);
  });
})();