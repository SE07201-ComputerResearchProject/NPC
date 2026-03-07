// Toggle Dark/Light Mode
const navbarTop = document.getElementById('navbarTop');
const toggleBtn = document.getElementById('toggleTheme');
const background = document.querySelector('.background');
const floatingMenu = document.querySelector('.floating-menu');
let lastScrollY = window.scrollY;

// helper to switch the toggle icon between moon and sun
function updateThemeIcon() {
  if (!toggleBtn) return;
  if (document.body.classList.contains('bg-dark')) {
    toggleBtn.innerHTML = '<i data-lucide="sun"></i>';
  } else {
    toggleBtn.innerHTML = '<i data-lucide="moon"></i>';
  }
  lucide.createIcons(); // re-scan new icon element
}

// set initial icon on load
updateThemeIcon();

toggleBtn.addEventListener('click', (e) => {
  // create ripple effect from button location
  const rect = toggleBtn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const ripple = document.createElement('div');
  ripple.className = 'mode-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  document.body.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());

  //Toggle body Classes
  document.body.classList.toggle('bg-dark');
  document.body.classList.toggle('text-white');
  document.body.classList.toggle('bg-light');
  document.body.classList.toggle('text-dark');

  //Toggle Navbar Classes
  navbarTop.classList.toggle('bg-dark');
  navbarTop.classList.toggle('navbar-dark');

  //Toggle Sidebar Classes
  sidebar.classList.toggle('bg-dark');
  sidebar.classList.toggle('text-white');
  sidebar.classList.toggle('bg-light');
  sidebar.classList.toggle('text-dark');

  //Toggle Background Classes
  background.classList.toggle('background-dark');
  // add retrowave image when in dark mode
  if (document.body.classList.contains('bg-dark')) {
    background.classList.add('retrowave');
  } else {
    background.classList.remove('retrowave');
  }

  // update icon at end of click handler
  updateThemeIcon();
});

// hide/show floating menu on scroll
window.addEventListener('scroll', () => {
  if (!floatingMenu) return;
  const compMenu = document.getElementById('componentsMenu');
  const authModal = document.getElementById('authModal');
  if (window.scrollY > lastScrollY) {
    floatingMenu.classList.add('hidden');
    if (compMenu) compMenu.classList.add('hidden');
    if (authModal) closeAuthPopup();
  } else {
    floatingMenu.classList.remove('hidden');
    if (compMenu) compMenu.classList.remove('hidden');
  }
  lastScrollY = window.scrollY;
});

var typing = new Typed('.typing', {
  strings: [
    '<span style ="color: #00f7ff">Compatibility</span>',
    '<span style ="color: #2af355">Price Comparison</span>',
    '<span style ="color: #00a2ff">User Reviews</span>',
  ],
  typeSpeed: 80,
  backSpeed: 50,
  loop: true
});
