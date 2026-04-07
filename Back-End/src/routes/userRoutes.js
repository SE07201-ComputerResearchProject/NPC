import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import User from '../models/User.js';
import Log from '../models/Log.js';
import { requireAuth, requireAdmin, requireSelfOrAdmin } from '../middleware/adminMiddleware.js';
import { sendOtpEmail } from '../utils/emailUtils.js';

const router = express.Router();
const googleClient = new OAuth2Client();
const loginAttempts = new Map();
const LOGIN_SPAM_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_CAPTCHA_AFTER_FAILURES = 5;
const LOGIN_CAPTCHA_LOCK_MS = 15 * 60 * 1000;

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
    mfaEnabled: Boolean(user?.mfa?.enabled),
    emailMfaEnabled: Boolean(user?.emailMfa?.enabled),
  };
}

function getMfaIssuer() {
  return String(process.env.MFA_ISSUER || 'Breaking Bad Builder').trim();
}

function getLoginAttemptKey(req, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const ip = String(req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown');
  return `${normalizedEmail}|${ip}`;
}

function getLoginAttemptState(key) {
  const current = loginAttempts.get(key);
  if (!current) {
    return { failCount: 0, firstFailedAt: 0, captchaUntil: 0 };
  }

  const now = Date.now();
  if (current.firstFailedAt && now - current.firstFailedAt > LOGIN_SPAM_WINDOW_MS) {
    loginAttempts.delete(key);
    return { failCount: 0, firstFailedAt: 0, captchaUntil: 0 };
  }

  return current;
}

function requiresCaptchaForAttempt(state) {
  return Boolean(state?.captchaUntil && state.captchaUntil > Date.now());
}

function registerFailedLoginAttempt(key) {
  const now = Date.now();
  const current = getLoginAttemptState(key);
  const next = {
    failCount: current.failCount + 1,
    firstFailedAt: current.firstFailedAt || now,
    captchaUntil: current.captchaUntil || 0,
  };

  if (next.failCount >= LOGIN_CAPTCHA_AFTER_FAILURES) {
    next.captchaUntil = now + LOGIN_CAPTCHA_LOCK_MS;
  }

  loginAttempts.set(key, next);
  return next;
}

function clearLoginAttempt(key) {
  loginAttempts.delete(key);
}

function buildJwtForUser(user) {
  return jwt.sign(
    { userId: String(user._id), role: user.role, email: user.email },
    process.env.JWT_SECRET,
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
    const { idToken, otpToken, emailOtpToken, mfaMethod, captchaToken } = req.body;

    // IP-based spam protection — only kicks in after repeated failures
    const googleAttemptKey = `google:${String(req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')}`;
    const googleAttemptState = getLoginAttemptState(googleAttemptKey);
    if (requiresCaptchaForAttempt(googleAttemptState)) {
      const recaptcha = await verifyRecaptchaToken(captchaToken);
      if (!recaptcha.success) {
        return res.status(400).json({
          message: 'Too many failed attempts. Please complete the captcha to continue.',
          requiresCaptcha: true,
        });
      }
    }

    const verified = await verifyGoogleIdToken(idToken);
    if (!verified.success) {
      registerFailedLoginAttempt(googleAttemptKey);
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

    // Check MFA
    const mfaSecret = String(user?.mfa?.secret || '').trim();
    const hasTOTPGoogle = Boolean(user?.mfa?.enabled && mfaSecret);
    const hasEmailOTPGoogle = Boolean(user?.emailMfa?.enabled);

    if (hasTOTPGoogle && hasEmailOTPGoogle && !mfaMethod) {
      return res.status(202).json({
        message: 'This account has two verification methods. Please choose one to continue.',
        requiresMfaChoice: true,
        hasTOTP: true,
        hasEmailOTP: true,
      });
    }

    const effectiveMethodGoogle = mfaMethod || (hasTOTPGoogle ? 'totp' : hasEmailOTPGoogle ? 'email' : null);

    if (effectiveMethodGoogle === 'totp' && hasTOTPGoogle) {
      if (!otpToken) {
        return res.status(202).json({
          message: 'Enter the code from your authenticator app.',
          requiresOtp: true,
          requiresCaptcha: requiresCaptchaForAttempt(googleAttemptState),
        });
      }

      const isOtpValid = speakeasy.totp.verify({
        secret: mfaSecret,
        encoding: 'base32',
        token: String(otpToken).trim(),
        window: 1,
      });

      if (!isOtpValid) {
        const nextState = registerFailedLoginAttempt(googleAttemptKey);
        Log.create({ user: user.email, activity: 'Google login failed due to invalid MFA OTP' }).catch(() => {});
        return res.status(401).json({
          message: 'Invalid OTP code',
          requiresOtp: true,
          requiresCaptcha: requiresCaptchaForAttempt(nextState),
        });
      }
    } else if (effectiveMethodGoogle === 'email' && hasEmailOTPGoogle) {
      // Email OTP MFA
      if (!emailOtpToken) {
        // Generate and send OTP
        const lastSent = user.emailMfa?.otpSentAt;
        if (lastSent && Date.now() - new Date(lastSent).getTime() < EMAIL_MFA_RESEND_COOLDOWN_MS) {
          return res.status(202).json({
            message: 'A verification code was already sent to your email. Please check your inbox.',
            requiresEmailOtp: true,
          });
        }

        const otp = String(crypto.randomInt(100000, 1000000));
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        user.emailMfa = {
          ...(user.emailMfa?.toObject ? user.emailMfa.toObject() : (user.emailMfa || {})),
          pendingOtp: otpHash,
          otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          otpSentAt: new Date(),
          otpAttempts: 0,
        };
        user.updatedAt = new Date();
        await user.save();

        sendOtpEmail(user.email, otp).catch((err) => {
          console.error('Failed to send email OTP for Google login:', err.message);
        });
        Log.create({ user: user.email, activity: 'Google login email OTP sent' }).catch(() => {});

        return res.status(202).json({
          message: 'A 6-digit verification code has been sent to your email.',
          requiresEmailOtp: true,
        });
      }

      // Verify the email OTP
      const isExpired = !user.emailMfa?.otpExpiresAt || new Date(user.emailMfa.otpExpiresAt) < new Date();
      if (isExpired) {
        return res.status(400).json({
          message: 'Verification code has expired. Please sign in again to receive a new code.',
          requiresEmailOtp: true,
        });
      }

      if ((user.emailMfa?.otpAttempts || 0) >= 5) {
        return res.status(429).json({
          message: 'Too many failed attempts. Please sign in again to receive a new code.',
          requiresEmailOtp: true,
        });
      }

      const providedHash = crypto.createHash('sha256').update(String(emailOtpToken).trim()).digest('hex');
      if (providedHash !== user.emailMfa?.pendingOtp) {
        user.emailMfa.otpAttempts = (user.emailMfa.otpAttempts || 0) + 1;
        await user.save();
        Log.create({ user: user.email, activity: 'Google login failed due to invalid email OTP' }).catch(() => {});
        return res.status(401).json({ message: 'Invalid verification code.', requiresEmailOtp: true });
      }

      // Clear OTP on success
      user.emailMfa = {
        ...(user.emailMfa?.toObject ? user.emailMfa.toObject() : (user.emailMfa || {})),
        pendingOtp: '',
        otpExpiresAt: null,
        otpAttempts: 0,
      };
      user.updatedAt = new Date();
      await user.save();
    }

    clearLoginAttempt(googleAttemptKey);
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
    const { email, password, otpToken, emailOtpToken, mfaMethod, captchaToken } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const attemptKey = getLoginAttemptKey(req, normalizedEmail);
    const attemptState = getLoginAttemptState(attemptKey);

    if (requiresCaptchaForAttempt(attemptState)) {
      const recaptcha = await verifyRecaptchaToken(captchaToken);
      if (!recaptcha.success) {
        return res.status(400).json({
          message: recaptcha.message,
          requiresCaptcha: true,
        });
      }
    }

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: 'Please provide email and password',
        requiresCaptcha: requiresCaptchaForAttempt(attemptState),
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const nextAttempt = registerFailedLoginAttempt(attemptKey);
      Log.create({ user: 'anon', activity: `Login failed, email attempted: ${normalizedEmail}` }).catch(() => {});
      return res.status(401).json({
        message: 'Invalid email or password',
        requiresCaptcha: requiresCaptchaForAttempt(nextAttempt),
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const nextAttempt = registerFailedLoginAttempt(attemptKey);
      Log.create({ user: 'anon', activity: `Login failed, email attempted: ${normalizedEmail}` }).catch(() => {});
      return res.status(401).json({
        message: 'Invalid email or password',
        requiresCaptcha: requiresCaptchaForAttempt(nextAttempt),
      });
    }

    const mfaSecret = String(user?.mfa?.secret || '').trim();
    const hasTOTP = Boolean(user?.mfa?.enabled && mfaSecret);
    const hasEmailOTP = Boolean(user?.emailMfa?.enabled);

    if (hasTOTP && hasEmailOTP && !mfaMethod) {
      return res.status(202).json({
        message: 'This account has two verification methods. Please choose one to continue.',
        requiresMfaChoice: true,
        hasTOTP: true,
        hasEmailOTP: true,
      });
    }

    const effectiveMethod = mfaMethod || (hasTOTP ? 'totp' : hasEmailOTP ? 'email' : null);

    if (effectiveMethod === 'totp' && hasTOTP) {
      if (!otpToken) {
        return res.status(202).json({
          message: 'Enter the code from your authenticator app.',
          requiresOtp: true,
          requiresCaptcha: requiresCaptchaForAttempt(attemptState),
        });
      }

      const isOtpValid = speakeasy.totp.verify({
        secret: mfaSecret,
        encoding: 'base32',
        token: String(otpToken).trim(),
        window: 1,
      });

      if (!isOtpValid) {
        const nextAttempt = registerFailedLoginAttempt(attemptKey);
        Log.create({ user: user.email, activity: 'Login failed due to invalid MFA OTP' }).catch(() => {});
        return res.status(401).json({
          message: 'Invalid OTP code',
          requiresOtp: true,
          requiresCaptcha: requiresCaptchaForAttempt(nextAttempt),
        });
      }
    } else if (effectiveMethod === 'email' && hasEmailOTP) {
      if (!emailOtpToken) {
        const lastSent = user.emailMfa?.otpSentAt;
        if (lastSent && Date.now() - new Date(lastSent).getTime() < EMAIL_MFA_RESEND_COOLDOWN_MS) {
          return res.status(202).json({
            message: 'A verification code was already sent to your email. Please check your inbox.',
            requiresEmailOtp: true,
          });
        }
        const { otp, hash } = generateEmailOtp();
        user.emailMfa = {
          ...(user.emailMfa?.toObject ? user.emailMfa.toObject() : (user.emailMfa || {})),
          pendingOtp: hash,
          otpExpiresAt: new Date(Date.now() + EMAIL_MFA_OTP_EXPIRY_MS),
          otpSentAt: new Date(),
          otpAttempts: 0,
        };
        user.updatedAt = new Date();
        await user.save();
        sendOtpEmail(user.email, otp).catch((error) => {
          console.error('Failed to send login email OTP:', error.message);
        });
        Log.create({ user: user.email, activity: 'Login email OTP sent' }).catch(() => {});
        return res.status(202).json({
          message: 'A 6-digit verification code has been sent to your email.',
          requiresEmailOtp: true,
        });
      }

      const isExpired = !user.emailMfa?.otpExpiresAt || new Date(user.emailMfa.otpExpiresAt) < new Date();
      if (isExpired) {
        return res.status(400).json({
          message: 'Verification code has expired. Please log in again.',
          requiresEmailOtp: true,
        });
      }
      if ((user.emailMfa?.otpAttempts || 0) >= EMAIL_MFA_MAX_ATTEMPTS) {
        return res.status(429).json({
          message: 'Too many failed attempts. Please log in again.',
          requiresEmailOtp: true,
        });
      }
      const providedHash = crypto.createHash('sha256').update(String(emailOtpToken).trim()).digest('hex');
      if (providedHash !== user.emailMfa?.pendingOtp) {
        user.emailMfa.otpAttempts = (user.emailMfa.otpAttempts || 0) + 1;
        await user.save();
        Log.create({ user: user.email, activity: 'Login failed due to invalid email OTP' }).catch(() => {});
        return res.status(401).json({ message: 'Invalid verification code.', requiresEmailOtp: true });
      }
      user.emailMfa = {
        ...(user.emailMfa?.toObject ? user.emailMfa.toObject() : (user.emailMfa || {})),
        pendingOtp: '',
        otpExpiresAt: null,
        otpAttempts: 0,
      };
      user.updatedAt = new Date();
      await user.save();
    }

    clearLoginAttempt(attemptKey);
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

// Create Google Authenticator QR for current user
router.get('/mfa/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.currentUser.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      enabled: Boolean(user.mfa?.enabled),
      enabledAt: user.mfa?.enabledAt || null,
      emailMfaEnabled: Boolean(user.emailMfa?.enabled),
      emailMfaEnabledAt: user.emailMfa?.enabledAt || null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get MFA status', error: error.message });
  }
});

router.post('/mfa/setup', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.currentUser.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const issuer = getMfaIssuer();
    const accountName = user.email || user.username || String(user._id);
    const secret = speakeasy.generateSecret({
      name: `${issuer}:${accountName}`,
      issuer,
      length: 20,
    });

    user.mfa = {
      ...(user.mfa || {}),
      enabled: false,
      secret: '',
      tempSecret: secret.base32,
      enabledAt: null,
    };
    user.updatedAt = new Date();
    await user.save();

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
      message: 'Scan this QR code with Google Authenticator, then verify with a 6-digit code.',
      qrDataUrl,
      otpauthUrl: secret.otpauth_url,
      manualEntryKey: secret.base32,
      issuer,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to setup MFA', error: error.message });
  }
});

// Verify initial setup code and enable MFA
router.post('/mfa/verify-setup', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'MFA code is required' });
    }

    const user = await User.findById(req.currentUser.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const tempSecret = String(user?.mfa?.tempSecret || '').trim();
    if (!tempSecret) {
      return res.status(400).json({ message: 'MFA setup is not initialized. Please call /mfa/setup first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid MFA code' });
    }

    user.mfa = {
      ...(user.mfa || {}),
      enabled: true,
      secret: tempSecret,
      tempSecret: '',
      enabledAt: new Date(),
    };
    user.updatedAt = new Date();
    await user.save();

    Log.create({ user: user.email, activity: 'MFA enabled via Google Authenticator' }).catch(() => {});

    return res.status(200).json({
      message: 'MFA enabled successfully',
      user: serializeUserForClient(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify MFA setup', error: error.message });
  }
});

// Disable MFA for current user (must provide current TOTP code)
router.post('/mfa/disable', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'MFA code is required to disable MFA' });
    }

    const user = await User.findById(req.currentUser.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activeSecret = String(user?.mfa?.secret || '').trim();
    if (!user?.mfa?.enabled || !activeSecret) {
      return res.status(400).json({ message: 'MFA is not enabled for this account' });
    }

    const verified = speakeasy.totp.verify({
      secret: activeSecret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid MFA code' });
    }

    user.mfa = {
      enabled: false,
      secret: '',
      tempSecret: '',
      enabledAt: null,
    };
    user.updatedAt = new Date();
    await user.save();

    Log.create({ user: user.email, activity: 'MFA disabled' }).catch(() => {});

    return res.status(200).json({
      message: 'MFA disabled successfully',
      user: serializeUserForClient(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to disable MFA', error: error.message });
  }
});

// ── Email MFA Routes ─────────────────────────────────────────────────────────
const EMAIL_MFA_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_MFA_OTP_EXPIRY_MS = 10 * 60 * 1000;
const EMAIL_MFA_MAX_ATTEMPTS = 5;

function generateEmailOtp() {
  const otp = String(crypto.randomInt(100000, 1000000));
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  return { otp, hash };
}

// Send OTP to email (used for enable/disable from Account page)
router.post('/mfa/email/send-code', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.currentUser.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const lastSent = user.emailMfa?.otpSentAt;
    if (lastSent && Date.now() - new Date(lastSent).getTime() < EMAIL_MFA_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: 'Please wait a moment before requesting another code.' });
    }

    const { otp, hash } = generateEmailOtp();

    user.emailMfa = {
      ...(user.emailMfa?.toObject ? user.emailMfa.toObject() : (user.emailMfa || {})),
      pendingOtp: hash,
      otpExpiresAt: new Date(Date.now() + EMAIL_MFA_OTP_EXPIRY_MS),
      otpSentAt: new Date(),
      otpAttempts: 0,
    };
    user.updatedAt = new Date();
    await user.save();

    sendOtpEmail(user.email, otp).catch((error) => {
      console.error('Failed to send account email OTP:', error.message);
    });

    return res.status(200).json({ message: 'Verification code sent to your email.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send verification code', error: error.message });
  }
});

// Enable email MFA (verify the OTP that was sent)
router.post('/mfa/email/enable', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Verification code is required' });

    const user = await User.findById(req.currentUser.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isExpired = !user.emailMfa?.otpExpiresAt || new Date(user.emailMfa.otpExpiresAt) < new Date();
    if (isExpired) return res.status(400).json({ message: 'Code has expired. Please request a new one.' });

    if ((user.emailMfa?.otpAttempts || 0) >= EMAIL_MFA_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    const providedHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
    if (providedHash !== user.emailMfa?.pendingOtp) {
      user.emailMfa.otpAttempts = (user.emailMfa.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.emailMfa = {
      enabled: true,
      enabledAt: new Date(),
      pendingOtp: '',
      otpExpiresAt: null,
      otpSentAt: null,
      otpAttempts: 0,
    };
    user.updatedAt = new Date();
    await user.save();

    Log.create({ user: user.email, activity: 'Email MFA enabled' }).catch(() => {});
    return res.status(200).json({
      message: 'Email verification enabled successfully',
      user: serializeUserForClient(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to enable email MFA', error: error.message });
  }
});

// Disable email MFA (verify OTP first)
router.post('/mfa/email/disable', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Verification code is required' });

    const user = await User.findById(req.currentUser.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user?.emailMfa?.enabled) {
      return res.status(400).json({ message: 'Email MFA is not enabled' });
    }

    const isExpired = !user.emailMfa?.otpExpiresAt || new Date(user.emailMfa.otpExpiresAt) < new Date();
    if (isExpired) return res.status(400).json({ message: 'Code has expired. Please request a new one.' });

    if ((user.emailMfa?.otpAttempts || 0) >= EMAIL_MFA_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    const providedHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
    if (providedHash !== user.emailMfa?.pendingOtp) {
      user.emailMfa.otpAttempts = (user.emailMfa.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.emailMfa = {
      enabled: false,
      enabledAt: null,
      pendingOtp: '',
      otpExpiresAt: null,
      otpSentAt: null,
      otpAttempts: 0,
    };
    user.updatedAt = new Date();
    await user.save();

    Log.create({ user: user.email, activity: 'Email MFA disabled' }).catch(() => {});
    return res.status(200).json({
      message: 'Email verification disabled successfully',
      user: serializeUserForClient(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to disable email MFA', error: error.message });
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

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName, dateOfBirth, address } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!username || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({
      username,
      email: normalizedEmail,
      password,
      fullName: fullName || '',
      dateOfBirth: dateOfBirth || null,
      address: address || { street: '', city: '', state: '', zip: '' },
      provider: 'local',
      role: 'user',
    });

    await user.save();
    Log.create({ user: req.currentUser?.email || 'admin', activity: `Admin created user: ${normalizedEmail}` }).catch(() => {});

    return res.status(201).json({
      message: 'User created successfully',
      user: serializeUserForClient(user),
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    return res.status(500).json({ message: 'Failed to create user', error: error.message });
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
