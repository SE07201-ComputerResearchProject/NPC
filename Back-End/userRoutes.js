import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from './User.js';

const router = express.Router();
const googleClient = new OAuth2Client();

function buildJwtForUser(user) {
  return jwt.sign(
    { userId: String(user._id), role: user.role, email: user.email },
    process.env.JWT_SECRET || 'dev_secret_change_in_prod',
    { expiresIn: '7d' }
  );
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
      if (!user.provider) {
        user.provider = 'google';
        shouldSave = true;
      }
      if (!user.fullName && name) {
        user.fullName = name;
        shouldSave = true;
      }
      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
        shouldSave = true;
      }
      if (shouldSave) {
        user.updatedAt = new Date();
        await user.save();
      }
    }

    const token = buildJwtForUser(user);

    return res.status(200).json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
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

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
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
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = buildJwtForUser(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Get all users (admin only - for testing)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
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
router.put('/:id', async (req, res) => {
  try {
    const { username, fullName, dateOfBirth, address } = req.body;
    
    // Build update object - email is NOT updatable
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
    updateData.updatedAt = new Date();

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
router.delete('/:id', async (req, res) => {
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
