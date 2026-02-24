/**
 * Authentication Routes
 * POST /api/auth/login - User login
 * POST /api/auth/logout - User logout
 * POST /api/auth/refresh-token - Refresh JWT token
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

// Login rate limiter: 20 requests per 15 minutes
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => res.status(429).json({ status: 'error', message: 'Too many login attempts, please try again later.' })
});

/**
 * @route POST /api/auth/register
 * @desc Register new user
 */
router.post('/register', AuthController.register);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT token
 */
router.post('/login', loginLimiter, AuthController.login);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 */
router.post('/logout', AuthController.logout);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh JWT token
 */
router.post('/refresh-token', AuthController.refreshToken);

/**
 * @route POST /api/auth/reset-password
 * @desc Consume password reset token and set new password
 */
router.post('/reset-password', AuthController.resetPassword);
/**
 * @route POST /api/auth/request-reset
 * @desc Request a password reset link (public)
 */
router.post('/request-reset', AuthController.requestReset);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 */
router.get('/me', authenticate, AuthController.me);

module.exports = router;
