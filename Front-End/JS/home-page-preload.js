(function () {
  const preloader = document.getElementById('homePreloader');
  if (!preloader) return;
  try {
    const preloaderCooldownMs = 20 * 60 * 1000;
    const lastShownAt = Number(localStorage.getItem('homePreloaderLastShownAt') || '0');
    const stillInCooldown =
      Number.isFinite(lastShownAt) && Date.now() - lastShownAt < preloaderCooldownMs;
    window.__showHomePreloader = !stillInCooldown;
    if (stillInCooldown) {
      // Preloader was shown recently, hide it and apply animations
      preloader.classList.add('hidden');
      document.body.classList.add('fade-in-animation');
      // Apply animations to hero elements with slight delay
      setTimeout(function () {
        applyHeroAnimations();
      }, 50);
    } else {
      // Show preloader and schedule animations when it finishes
      const hidePreloaderDelay = 2500; // 2.5 seconds
      setTimeout(function () {
        preloader.classList.add('hidden');
        localStorage.setItem('homePreloaderLastShownAt', String(Date.now()));
        // Add fade-in animation to body after preloader hides
        requestAnimationFrame(function () {
          document.body.classList.add('fade-in-animation');
          // Apply hero animations after body fade-in starts
          setTimeout(function () {
            applyHeroAnimations();
          }, 100);
        });
      }, hidePreloaderDelay);
    }
  } catch {
    window.__showHomePreloader = true;
  }

  function applyHeroAnimations() {
    const navBar = document.querySelector('.navbar-glass.navbar-pill');
    const heroContentLeft = document.querySelector('.hero-content-left');
    const heroSliderCard = document.getElementById('heroSlider');

    if (navBar) navBar.classList.add('animate-in');
    if (heroContentLeft) heroContentLeft.classList.add('animate-in');
    if (heroSliderCard) heroSliderCard.classList.add('animate-in');
  }
})();
