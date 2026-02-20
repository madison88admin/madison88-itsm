const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function authenticate(req, res, next) {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ status: 'error', message: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Validate UUID format to prevent DB syntax errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!payload.user_id || !uuidRegex.test(payload.user_id)) {
      return res.status(401).json({ status: 'error', message: 'Invalid user ID format' });
    }

    const user = await UserModel.findById(payload.user_id);
    if (!user || !user.is_active) return res.status(401).json({ status: 'error', message: 'Invalid user' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Missing or invalid token' });
    }
    // Global admins can access everything
    if (req.user.role === 'system_admin') {
      return next();
    }
    if (!roles.length || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ status: 'error', message: 'Forbidden: insufficient permissions' });
  };
}

module.exports = { authenticate, authorize };
