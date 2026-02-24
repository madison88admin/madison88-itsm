/**
 * User Activity Controller
 * Endpoints for viewing active users and activity logs
 */

const UserActivityService = require('../services/user-activity.service');
const logger = require('../utils/logger');

class UserActivityController {
  /**
   * GET /api/admin/active-users
   * Get all active users (logged in within last 15 minutes)
   * Location-filtered: Managers/Admins see only their location
   */
  static async getActiveUsers(req, res, next) {
    try {
      const { withinMinutes = 15 } = req.query;
      
      // Location-based filtering: IT managers see only their location
      // System admins see all locations
      const locationFilter = req.user.role === 'it_manager' ? req.user.location : null;
      
      const activeUsers = await UserActivityService.getActiveUsers(
        parseInt(withinMinutes),
        locationFilter
      );
      
      res.json({
        status: 'success',
        data: {
          count: activeUsers.length,
          activeUsers,
          location: locationFilter || 'All Locations',
          timestamp: new Date()
        }
      });
    } catch (err) {
      logger.error(`Get Active Users Error: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * GET /api/admin/activity-logs
   * Get all activity logs with optional filters
   * Location-filtered: IT managers see only their location
   */
  static async getActivityLogs(req, res, next) {
    try {
      const { 
        activityType, 
        userId, 
        role, 
        startDate, 
        endDate, 
        limit = 100, 
        offset = 0 
      } = req.query;

      // Location-based filtering: IT managers see only their location
      const locationFilter = req.user.role === 'it_manager' ? req.user.location : null;

      const filters = {
        activityType: activityType || null,
        userId: userId || null,
        role: role || null,
        startDate: startDate || null,
        endDate: endDate || null
      };

      const logs = await UserActivityService.getAllActivityLogs(
        filters,
        Math.min(parseInt(limit), 1000),
        parseInt(offset),
        locationFilter
      );

      res.json({
        status: 'success',
        data: {
          count: logs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          location: locationFilter || 'All Locations',
          logs
        }
      });
    } catch (err) {
      logger.error(`Get Activity Logs Error: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * GET /api/admin/user-activity/:userId
   * Get specific user's activity history
   */
  static async getUserActivityHistory(req, res, next) {
    try {
      const { userId } = req.params;
      const { limit = 100 } = req.query;

      const history = await UserActivityService.getUserActivityHistory(
        userId,
        Math.min(parseInt(limit), 500)
      );

      res.json({
        status: 'success',
        data: {
          userId,
          count: history.length,
          activities: history
        }
      });
    } catch (err) {
      logger.error(`Get User Activity History Error: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * GET /api/admin/user-session/:userId
   * Get user's current session info
   */
  static async getUserSession(req, res, next) {
    try {
      const { userId } = req.params;

      const session = await UserActivityService.getUserSession(userId);

      if (!session) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      res.json({
        status: 'success',
        data: { session }
      });
    } catch (err) {
      logger.error(`Get User Session Error: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * GET /api/admin/activity-stats
   * Get activity statistics
   * Location-filtered: IT managers see only their location
   */
  static async getActivityStats(req, res, next) {
    try {
      const { period = '24_hours' } = req.query;

      // Location-based filtering: IT managers see only their location
      const locationFilter = req.user.role === 'it_manager' ? req.user.location : null;

      const stats = await UserActivityService.getActivityStats(period, locationFilter);

      res.json({
        status: 'success',
        data: {
          period,
          location: locationFilter || 'All Locations',
          stats
        }
      });
    } catch (err) {
      logger.error(`Get Activity Stats Error: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * POST /api/admin/purge-logs
   * Delete activity logs older than specified days
   */
  static async purgeLogs(req, res, next) {
    try {
      const { daysOld = 90 } = req.body;

      const rowsDeleted = await UserActivityService.purgeOldLogs(parseInt(daysOld));

      logger.info(`Admin purged ${rowsDeleted} activity logs older than ${daysOld} days`, {
        admin: req.user.user_id
      });

      res.json({
        status: 'success',
        message: `Deleted ${rowsDeleted} activity logs older than ${daysOld} days`,
        data: { rowsDeleted }
      });
    } catch (err) {
      logger.error(`Purge Logs Error: ${err.message}`, err);
      next(err);
    }
  }
}

module.exports = UserActivityController;
