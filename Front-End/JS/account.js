// account.js - handle account profile page

const USER_API_BASE_URL = 'http://localhost:3000/api/users';
const CURRENT_USER_API_URL = `${USER_API_BASE_URL}/me`;

function buildAuthHeaders(baseHeaders = {}) {
  const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('authToken') || '');
  if (!token) return baseHeaders;

  return {
    ...baseHeaders,
    Authorization: `Bearer ${token}`,
  };
}

function normalizeUserPayload(payload) {
  return payload && payload.user ? payload.user : payload;
}

function hasProfileContent(user) {
  if (!user || typeof user !== 'object') return false;

  return Boolean(
    user.username ||
    user.email ||
    user.fullName ||
    user.avatarUrl ||
    user.address?.street ||
    user.address?.city ||
    user.address?.state ||
    user.address?.zip
  );
}

function formatDateForInput(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function populateProfileForm(user) {
  document.getElementById('username').value = user.username || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('fullName').value = user.fullName || '';
  document.getElementById('dob').value = formatDateForInput(user.dateOfBirth);

  const address = user.address || {};
  document.getElementById('street').value = address.street || '';
  document.getElementById('city').value = address.city || '';
  document.getElementById('state').value = address.state || '';
  document.getElementById('zip').value = address.zip || '';
}

function updateIdentityPanel(user) {
  const identityEl = document.getElementById('accountIdentity');
  const providerEl = document.getElementById('accountProvider');
  const avatarEl = document.getElementById('accountAvatar');
  if (!identityEl || !providerEl || !avatarEl) return;

  const provider = String(user.provider || 'local').toLowerCase();
  providerEl.textContent = provider === 'google' ? 'Google Account' : 'Local Account';

  const avatarUrl = user.avatarUrl || '';
  if (avatarUrl) {
    avatarEl.src = avatarUrl;
    avatarEl.style.display = 'block';
  } else {
    avatarEl.removeAttribute('src');
    avatarEl.style.display = 'none';
  }

  identityEl.style.display = 'flex';
}

function syncProfileToStorage(user) {
  const existingProfile = getProfile();
  const provider = user.provider || existingProfile.provider || 'local';
  const googleId = user.googleId || existingProfile.googleId || '';

  saveProfile({
    ...existingProfile,
    userId: user._id || user.id || existingProfile.userId || localStorage.getItem('userId'),
    username: user.username || '',
    email: user.email || '',
    role: user.role || existingProfile.role || 'user',
    provider,
    googleId,
    fullName: user.fullName || '',
    dateOfBirth: user.dateOfBirth || null,
    address: user.address || { street: '', city: '', state: '', zip: '' },
    avatarUrl: user.avatarUrl || existingProfile.avatarUrl || '',
  });
}

function populateFromCachedProfile() {
  const cachedProfile = getProfile();
  if (!hasProfileContent(cachedProfile)) {
    return false;
  }

  populateProfileForm(cachedProfile);
  updateIdentityPanel(cachedProfile);
  return true;
}

function renderSavedBuildSummary() {
  const savedBuild = getBuild();
  const buildName = getBuildName() || 'New Build';
  const parts = Object.entries(savedBuild || {}).filter(([, part]) => part);

  let totalPrice = 0;
  let powerDraw = 0;

  parts.forEach(([key, part]) => {
    totalPrice += part.price || 0;
    if (key !== 'psu') {
      powerDraw += part.power || 0;
    }
  });

  const compatibilityOk = savedBuild?.psu ? powerDraw <= (savedBuild.psu.power || 0) : parts.length === 0;
  const partsListMarkup = parts.length
    ? parts.map(([, part]) => `
        <div class="part-item selected">
          <div class="part-info">
            <div class="part-name">${part.name}</div>
            <div class="part-price">${(part.price || 0).toLocaleString()} VND</div>
          </div>
        </div>
      `).join('')
    : '<div class="part-name-placeholder">No saved build yet</div>';

  document.getElementById('panelBuildName').textContent = buildName;
  document.getElementById('panelTotalPrice').textContent = `${totalPrice.toLocaleString()} VND`;
  document.getElementById('panelPowerDraw').textContent = `${powerDraw}W`;
  document.getElementById('panelCompatibility').textContent = compatibilityOk ? '✓ Compatible' : '✗ Incompatible';
  document.getElementById('panelCompatibility').className = compatibilityOk ? 'compatible' : 'incompatible';
  document.getElementById('panelPartsList').innerHTML = partsListMarkup;
}

document.addEventListener('DOMContentLoaded', async () => {
  window.isLoggedIn = getAuthState() || Boolean(getAuthToken());
  if (!window.isLoggedIn) {
    window.location.href = 'index.html';
    return;
  }

  const profile = getProfile();
  if ((profile.role || 'user').toLowerCase() === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  const profileForm = document.getElementById('profileForm');
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }

  async function loadUserProfile() {
    try {
      const hasCachedProfile = populateFromCachedProfile();

      const response = await fetch(CURRENT_USER_API_URL, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        showPopup(hasCachedProfile
          ? 'Cannot refresh account info right now. Please log in again if the data is outdated.'
          : 'Session expired or unauthorized. Please login again.');
        if (!hasCachedProfile) {
          logout();
        }
        return;
      }

      if (!response.ok) {
        showPopup(data.message || 'Failed to load profile');
        return;
      }

      const user = normalizeUserPayload(data);
      populateProfileForm(user);
      updateIdentityPanel(user);
      syncProfileToStorage(user);
      if (window.updateWelcomeMessage) window.updateWelcomeMessage();
    } catch (error) {
      console.error('Error loading profile:', error);
      if (!populateFromCachedProfile()) {
        showPopup('Cannot connect to server.');
      }
    }
  }

  async function saveUserProfile(e) {
    e.preventDefault();

    try {
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

      const response = await fetch(CURRENT_USER_API_URL, {
        method: 'PUT',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        showPopup('Session expired or unauthorized. Please login again.');
        logout();
        return;
      }

      if (!response.ok) {
        showPopup(data.message || 'Failed to update profile');
        return;
      }

      const user = normalizeUserPayload(data);
      populateProfileForm(user);
      updateIdentityPanel(user);
      syncProfileToStorage(user);
      showPopup('Profile updated successfully');
      if (window.updateWelcomeMessage) window.updateWelcomeMessage();
    } catch (error) {
      console.error('Error saving profile:', error);
      showPopup('Cannot connect to server.');
    }
  }

  await loadUserProfile();

  if (window.awaitCommerceStateReady) {
    await window.awaitCommerceStateReady();
  }

  if (profileForm) {
    profileForm.addEventListener('submit', saveUserProfile);
  }

  renderSavedBuildSummary();
});
