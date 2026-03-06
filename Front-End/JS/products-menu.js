// Products Menu Toggle
function toggleProductsMenu(event) {
  event.preventDefault();
  const menu = document.getElementById('productsMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
  const productsNavItem = document.querySelector('.products-nav-item');
  const menu = document.getElementById('productsMenu');
  
  if (productsNavItem && !productsNavItem.contains(event.target)) {
    menu.style.display = 'none';
  }
});

// Close menu when a menu item is clicked
const menuCategories = document.querySelectorAll('.menu-category');
menuCategories.forEach(item => {
  item.addEventListener('click', function() {
    const menu = document.getElementById('productsMenu');
    if (menu) {
      menu.style.display = 'none';
    }
  });
});
