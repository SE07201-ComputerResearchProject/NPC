// Toggle Dark/Light Mode
const sidebar = document.getElementById('sidebar');
const navbarTop = document.getElementById('navbarTop');
const toggleBtn = document.getElementById('toggleTheme');
toggleBtn.addEventListener('click', () => {
  //Toggle body Classes
  document.body.classList.toggle('bg-dark');
  document.body.classList.toggle('text-white');
  document.body.classList.toggle('bg-light');
  document.body.classList.toggle('text-dark');

  //Toggle Footer Classes
  document.querySelector('footer').classList.toggle('bg-dark');
  document.querySelector('footer').classList.toggle('text-white');
  document.querySelector('footer').classList.toggle('bg-light');
  document.querySelector('footer').classList.toggle('text-dark');
  
  //Toggle Navbar Classes
  navbarTop.classList.toggle('bg-dark');
  navbarTop.classList.toggle('navbar-dark');

  //Toggle Sidebar Classes
  sidebar.classList.toggle('bg-dark');
  sidebar.classList.toggle('text-white');
  sidebar.classList.toggle('bg-light');
  sidebar.classList.toggle('text-dark');
});

// Dots Animation
function createDots(numDots = 20) {
  const content = document.querySelector('.content');
  for (let i = 0 ; i < numDots; i++) {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    dot.style.left = Math.random() * 100 + '%';
    dot.style.animationDuration = (3 + Math.random() * 5) + 's';
    dot.style.animationDelay = (Math.random() * 5) + 's';
    content.appendChild(dot);
  }
}

createDots(30);