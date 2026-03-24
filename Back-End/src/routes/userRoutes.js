import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Log from '../models/Log.js';
import { requireAuth, requireAdmin, requireSelfOrAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();
const googleClient = new OAuth2Client();

function serializeUserForClient(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    provider: user.provider || 'local',
    googleId: user.googleId || '',
    fullName: user.fullName || '',
    dateOfBirth: user.dateOfBirth || null,
    address: user.address || { street: '', city: '', state: '', zip: '' },
    billingSameAsShipping: user.billingSameAsShipping !== false,
    billingAddress: user.billingAddress || { street: '', city: '', state: '', zip: '' },
    avatarUrl: user.avatarUrl || '',
  };
}

function buildJwtForUser(user) {
  return jwt.sign(
    { userId: String(user._id), role: user.role, email: user.email },
    process.env.JWT_SECRET || 'dev_secret_change_in_prod',
    { expiresIn: '7d' }
  );
}

function buildProfileUpdateData(body = {}) {
  const { username, fullName, dateOfBirth, address, billingAddress, billingSameAsShipping, avatarUrl } = body;
  const updateData = {};

  if (username) updateData.username = username;
  if (fullName !== undefined) updateData.fullName = fullName;
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
  if (address) {
    updateData.address = {
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || '',
    };
  }
  if (billingSameAsShipping !== undefined) {
    updateData.billingSameAsShipping = Boolean(billingSameAsShipping);
  }
  if (billingAddress) {
    updateData.billingAddress = {
      street: billingAddress.street || '',
      city: billingAddress.city || '',
      state: billingAddress.state || '',
      zip: billingAddress.zip || '',
    };
  }
  if (avatarUrl !== undefined) {
    updateData.avatarUrl = avatarUrl || '';
  }

  updateData.updatedAt = new Date();
  return updateData;
}

async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return { success: false, message: 'Missing GOOGLE_CLIENT_ID on server' };
  }

  if (!idToken) {
    return { success: false, message: 'Google idToken is required' };
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      return { success: false, message: 'Invalid Google token payload' };
    }

    if (payload.email_verified === false) {
      return { success: false, message: 'Google account email is not verified' };
    }

    return { success: true, payload };
  } catch {
    return { success: false, message: 'Invalid Google token' };
  }
}

async function verifyRecaptchaToken(captchaToken) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return { success: true, skipped: true };
  }

  if (!captchaToken) {
    return { success: false, message: 'Captcha token is required' };
  }

  try {
    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', captchaToken);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const payload = await response.json();
    if (!payload.success) {
      return { success: false, message: 'Captcha verification failed' };
    }

    return { success: true };
  } catch {
    return { success: false, message: 'Captcha verification service is unavailable' };
  }
}

router.post('/google', async (req, res) => {
  try {
    const { idToken, captchaToken } = req.body;

    const recaptcha = await verifyRecaptchaToken(captchaToken);
    if (!recaptcha.success) {
      return res.status(400).json({ message: recaptcha.message });
    }

    const verified = await verifyGoogleIdToken(idToken);
    if (!verified.success) {
      return res.status(401).json({ message: verified.message });
    }

    const payload = verified.payload;
    const email = String(payload.email).toLowerCase();
    const googleId = String(payload.sub);
    const name = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture || '';

    let user = await User.findOne({
      $or: [
        { googleId },
        { email },
      ],
    });

    if (!user) {
      user = new User({
        username: name,
        email,
        provider: 'google',
        googleId,
        fullName: name,
        avatarUrl,
      });
      await user.save();
    } else {
      let shouldSave = false;
      if (!user.googleId) {
        user.googleId = googleId;
        shouldSave = true;
      }
      if (user.provider !== 'google') {
        user.provider = 'google';
        shouldSave = true;
      }
      if (name && user.fullName !== name) {
        user.fullName = name;
        shouldSave = true;
      }
      if (avatarUrl && user.avatarUrl !== avatarUrl) {
        user.avatarUrl = avatarUrl;
        shouldSave = true;
      }
      if (name && user.username !== name) {
        user.username = name;
        shouldSave = true;
      }
      if (shouldSave) {
        user.updatedAt = new Date();
        await user.save();
      }
    }

    const token = buildJwtForUser(user);
    Log.create({ user: user.email, activity: 'Google login successful' }).catch(() => {});

    return res.status(200).json({
      message: 'Google login successful',
      token,
      user: serializeUserForClient(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Google login failed', error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, dateOfBirth, address, captchaToken } = req.body;

    const recaptcha = await verifyRecaptchaToken(captchaToken);
    if (!recaptcha.success) {
      return res.status(400).json({ message: recaptcha.message });
    }

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      Log.create({ user: 'anon', activity: `Registration failed, email already registered: ${email}` }).catch(() => {});
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({
      username,
      email,
      password,
      fullName: fullName || '',
      dateOfBirth: dateOfBirth || null,
      address: address || { street:'', city:'', state:'', zip:'' }
    });
    await user.save();

    const token = buildJwtForUser(user);
    Log.create({ user: email, activity: 'Registration succeeded' }).catch(() => {});

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: serializeUserForClient(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    const recaptcha = await verifyRecaptchaToken(captchaToken);
    if (!recaptcha.success) {
      return res.status(400).json({ message: recaptcha.message });
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      Log.create({ user: 'anon', activity: `Login failed, email attempted: ${email}` }).catch(() => {});
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      Log.create({ user: 'anon', activity: `Login failed, email attempted: ${email}` }).catch(() => {});
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = buildJwtForUser(user);
    Log.create({ user: user.email, activity: 'Login successful' }).catch(() => {});

    res.status(200).json({
      message: 'Login successful',
      token,
      user: serializeUserForClient(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Get all users (admin only - for testing)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.currentUser.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch current user', error: error.message });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.currentUser.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle password change when both fields are provided
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Both current password and new password are required to change password' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      if (user.provider === 'google' && !user.password) {
        return res.status(400).json({ message: 'Google accounts cannot set a local password here' });
      }
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    // Apply other profile fields
    const updateData = buildProfileUpdateData(req.body);
    Object.assign(user, updateData);

    await user.save();

    const updated = await User.findById(user._id).select('-password');
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update current user profile', error: error.message });
  }
});

// Get user by ID
router.get('/:id', requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

// Update user profile
router.put('/:id', requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const updateData = buildProfileUpdateData(req.body);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Delete user
router.delete('/:id', requireSelfOrAdmin('id'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

export default router;
