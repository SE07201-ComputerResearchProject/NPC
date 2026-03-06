// Products Menu Toggle
function toggleProductsMenu(event) {
  event.preventDefault();
  const menu = document.getElementById('productsMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
  const menu = document.getElementById('productsMenu');
  const productsLink = document.querySelector('.nav-item');
  
  if (!productsLink.contains(event.target)) {
    menu.style.display = 'none';
  }
});

// Close menu when a menu item is clicked
const menuItems = document.querySelectorAll('.products-menu .menu-item');
menuItems.forEach(item => {
  item.addEventListener('click', function() {
    document.getElementById('productsMenu').style.display = 'none';
  });
});
