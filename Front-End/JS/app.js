// Toggle Dark/Light Mode
const sidebar = document.getElementById('sidebar');
const navbarTop = document.getElementById('navbarTop');
const toggleBtn = document.getElementById('toggleTheme');
const background = document.querySelector('.background');
toggleBtn.addEventListener('click', () => {
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
