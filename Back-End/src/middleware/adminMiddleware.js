import jwt from 'jsonwebtoken';

function verifyTokenFromRequest(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, message: 'Authorization token required' };
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_in_prod');
    return { ok: true, decoded };
  } catch {
    return { ok: false, status: 401, message: 'Invalid or expired token' };
  }
}

export function requireAuth(req, res, next) {
  const verified = verifyTokenFromRequest(req);
  if (!verified.ok) {
    return res.status(verified.status).json({ message: verified.message });
  }

  req.currentUser = verified.decoded;
  next();
}

export function requireAdmin(req, res, next) {
  const verified = verifyTokenFromRequest(req);
  if (!verified.ok) {
    return res.status(verified.status).json({ message: verified.message });
  }

  if (verified.decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Admin role required' });
  }

  req.currentUser = verified.decoded;
  next();
}

export function requireSelfOrAdmin(idParam = 'id') {
  return (req, res, next) => {
    const verified = verifyTokenFromRequest(req);
    if (!verified.ok) {
      return res.status(verified.status).json({ message: verified.message });
    }

    const currentUser = verified.decoded;
    const targetUserId = String(req.params[idParam] || '');

    if (currentUser.role === 'admin' || String(currentUser.userId) === targetUserId) {
      req.currentUser = currentUser;
      return next();
    }

    return res.status(403).json({ message: 'Access denied: ownership or admin role required' });
  };
}