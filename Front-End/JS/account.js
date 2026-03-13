// account.js - handle account profile page

document.addEventListener('DOMContentLoaded', async () => {
  // Check if logged in
  window.isLoggedIn = getAuthState();
  if (!window.isLoggedIn) {
    window.location.href = 'index.html';
    return;
  }

  const profileForm = document.getElementById('profileForm');
  const logoutBtn = document.getElementById('logoutBtn');

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }

  // Load user profile from backend
  async function loadUserProfile() {
    try {
      const userId = getUserIdFromStorage();
      if (!userId) {
        showPopup('User ID not found. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/users/${userId}`);
      const data = await response.json();

      if (response.ok) {
        // Populate form with user data
        document.getElementById('username').value = data.user.username || '';
        document.getElementById('email').value = data.user.email || '';
        document.getElementById('fullName').value = data.user.fullName || '';
        
        // Format date for input[type="date"]
        if (data.user.dateOfBirth) {
          const dateObj = new Date(data.user.dateOfBirth);
          const formattedDate = dateObj.toISOString().split('T')[0];
          document.getElementById('dob').value = formattedDate;
        }

        // Address fields
        if (data.user.address) {
          document.getElementById('street').value = data.user.address.street || '';
          document.getElementById('city').value = data.user.address.city || '';
          document.getElementById('state').value = data.user.address.state || '';
          document.getElementById('zip').value = data.user.address.zip || '';
        }
      } else {
        showPopup(data.message || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showPopup('Cannot connect to server.');
    }
  }

  // Save profile to backend
  async function saveUserProfile(e) {
    e.preventDefault();

    try {
      const userId = getUserIdFromStorage();
      if (!userId) {
        showPopup('User ID not found. Please login again.');
        return;
      }

      const userData = {
        username: document.getElementById('username').value.trim(),
        fullName: document.getElementById('fullName').value.trim(),
        dateOfBirth: document.getElementById('dob').value || null,
        address: {
          street: document.getElementById('street').value.trim(),
          city: document.getElementById('city').value.trim(),
          state: document.getElementById('state').value.trim(),
          zip: document.getElementById('zip').value.trim(),
        },
      };

      const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage with new profile
        saveProfile({
          username: data.user.username,
          email: data.user.email,
          fullName: data.user.fullName,
          dateOfBirth: data.user.dateOfBirth,
          address: data.user.address,
        });
        
        showPopup('Profile updated successfully');
        if (window.updateWelcomeMessage) window.updateWelcomeMessage();
      } else {
        showPopup(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showPopup('Cannot connect to server.');
    }
  }

  // Helper to get user ID from storage or profile
  function getUserIdFromStorage() {
    const profile = getProfile();
    return profile.userId || localStorage.getItem('userId');
  }

  // Load profile on page load
  await loadUserProfile();

  // Form submission
  if (profileForm) {
    profileForm.addEventListener('submit', saveUserProfile);
  }

  // Load build info
  loadBuildFromLocalStorage();
  loadBuildNameFromDatabase();
  renderPartsList();
  updateStats();
});
