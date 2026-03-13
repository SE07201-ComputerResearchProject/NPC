import User from './User.js';

// Temporary role check using x-user-id header until JWT auth is added.
export async function requireAdmin(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        message: 'Missing x-user-id header',
      });
    }

    const user = await User.findById(userId).select('role email username');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin role is required' });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to validate admin permission',
      error: error.message,
    });
  }
}