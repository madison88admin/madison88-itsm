/**
 * User Activity Routes
 * Real-time user monitoring and activity logging
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const UserActivityController = require('../controllers/user-activity.controller');

const router = express.Router();

/**
 * All routes require authentication and system_admin role
 */

// Get all active users (logged in within last 15 minutes)
router.get(
  '/active-users',
  authenticate,
  authorize(['system_admin', 'it_manager']),
  UserActivityController.getActiveUsers
);

// Get all activity logs with filters
router.get(
  '/activity-logs',
  authenticate,
  authorize(['system_admin', 'it_manager']),
  UserActivityController.getActivityLogs
);

// Get specific user's activity history
router.get(
  '/user-activity/:userId',
  authenticate,
  authorize(['system_admin', 'it_manager']),
  UserActivityController.getUserActivityHistory
);

// Get user's session info
router.get(
  '/user-session/:userId',
  authenticate,
  authorize(['system_admin', 'it_manager']),
  UserActivityController.getUserSession
);

// Get activity statistics
router.get(
  '/activity-stats',
  authenticate,
  authorize(['system_admin', 'it_manager']),
  UserActivityController.getActivityStats
);

// Purge old logs (admin only)
router.post(
  '/purge-logs',
  authenticate,
  authorize(['system_admin']),
  UserActivityController.purgeLogs
);

module.exports = router;
