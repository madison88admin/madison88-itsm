/**
 * User Activity Service
 * Tracks real-time user logins, logouts, and activities
 */

const pool = require('../config/database');
const logger = require('../utils/logger');

class UserActivityService {
  /**
   * Log user login
   */
  static async logLogin(userId, ipAddress, userAgent, location = null) {
    const query = `
      INSERT INTO user_activity_logs (
        user_id, activity_type, ip_address, user_agent, location, activity_timestamp
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    try {
      const result = await pool.query(query, [
        userId,
        'LOGIN',
        ipAddress || 'UNKNOWN',
        userAgent || 'UNKNOWN',
        location
      ]);
      logger.info(`User ${userId} logged in`, { ipAddress, location });
      return result.rows[0];
    } catch (err) {
      logger.error(`Failed to log user login: ${err.message}`, { userId });
      throw err;
    }
  }

  /**
   * Log user logout
   */
  static async logLogout(userId) {
    const query = `
      INSERT INTO user_activity_logs (
        user_id, activity_type, activity_timestamp
      ) VALUES ($1, $2, NOW())
      RETURNING *
    `;
    try {
      const result = await pool.query(query, [userId, 'LOGOUT']);
      logger.info(`User ${userId} logged out`);
      return result.rows[0];
    } catch (err) {
      logger.error(`Failed to log user logout: ${err.message}`, { userId });
      throw err;
    }
  }

  /**
   * Log user activity (ticket view, comment, etc.)
   */
  static async logActivity(userId, activityType, resourceId, resourceType, details = null) {
    const query = `
      INSERT INTO user_activity_logs (
        user_id, activity_type, resource_id, resource_type, activity_details, activity_timestamp
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    try {
      const result = await pool.query(query, [
        userId,
        activityType,
        resourceId,
        resourceType,
        details ? JSON.stringify(details) : null
      ]);
      return result.rows[0];
    } catch (err) {
      logger.error(`Failed to log activity: ${err.message}`, { userId, activityType });
      // Don't throw - activity logging shouldn't break the main transaction
      return null;
    }
  }

  /**
   * Get active users right now (logged in, last activity within 15 minutes)
   * Filters by location if provided (for multi-tenant/multi-location support)
   */
  static async getActiveUsers(withinMinutes = 15, locationFilter = null) {
    let query = `
      SELECT DISTINCT ON (u.user_id)
        u.user_id,
        u.email,
        u.full_name,
        u.role,
        u.location,
        ual.activity_type,
        ual.activity_timestamp,
        ual.ip_address,
        ROUND(EXTRACT(EPOCH FROM (NOW() - ual.activity_timestamp))/60)::INT as minutes_since_activity
      FROM users u
      LEFT JOIN user_activity_logs ual ON u.user_id = ual.user_id
      WHERE u.is_active = true
        AND ual.activity_timestamp > NOW() - INTERVAL '${withinMinutes} MINUTES'
    `;
    
    // Add location filter if provided
    if (locationFilter) {
      query += ` AND u.location = '${locationFilter}'`;
    }
    
    query += `
      ORDER BY u.user_id, ual.activity_timestamp DESC
      LIMIT 1000
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (err) {
      logger.error(`Failed to get active users: ${err.message}`);
      return [];
    }
  }

  /**
   * Get user's activity history
   */
  static async getUserActivityHistory(userId, limit = 100) {
    const query = `
      SELECT 
        activity_id,
        user_id,
        activity_type,
        resource_id,
        resource_type,
        ip_address,
        user_agent,
        location,
        activity_details,
        activity_timestamp
      FROM user_activity_logs
      WHERE user_id = $1
      ORDER BY activity_timestamp DESC
      LIMIT $2
    `;
    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (err) {
      logger.error(`Failed to get user activity history: ${err.message}`, { userId });
      return [];
    }
  }

  /**
   * Get all activity logs (for admin monitoring)
   * Filters by location if user is not system_admin, or if location filter is specified
   */
  static async getAllActivityLogs(filters = {}, limit = 500, offset = 0, userLocation = null) {
    let query = `
      SELECT 
        ual.activity_id,
        ual.user_id,
        u.email,
        u.full_name,
        u.role,
        u.location,
        ual.activity_type,
        ual.resource_type,
        ual.ip_address,
        ual.activity_timestamp
      FROM user_activity_logs ual
      JOIN users u ON ual.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    // Location filtering: restrict to user's location if provided
    if (userLocation) {
      query += ` AND u.location = $${params.length + 1}`;
      params.push(userLocation);
    }

    // Apply filters
    if (filters.activityType) {
      query += ` AND ual.activity_type = $${params.length + 1}`;
      params.push(filters.activityType);
    }
    if (filters.userId) {
      query += ` AND ual.user_id = $${params.length + 1}`;
      params.push(filters.userId);
    }
    if (filters.role) {
      query += ` AND u.role = $${params.length + 1}`;
      params.push(filters.role);
    }
    if (filters.startDate) {
      query += ` AND ual.activity_timestamp >= $${params.length + 1}`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ` AND ual.activity_timestamp <= $${params.length + 1}`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY ual.activity_timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (err) {
      logger.error(`Failed to get activity logs: ${err.message}`);
      return [];
    }
  }

  /**
   * Get activity stats
   * Filters by location if user location is provided (multi-location support)
   */
  static async getActivityStats(period = '24_hours', userLocation = null) {
    let timeFilter = "NOW() - INTERVAL '24 HOURS'";
    if (period === '7_days') {
      timeFilter = "NOW() - INTERVAL '7 DAYS'";
    } else if (period === '30_days') {
      timeFilter = "NOW() - INTERVAL '30 DAYS'";
    }

    let query = `
      SELECT 
        activity_type,
        COUNT(*) as count,
        COUNT(DISTINCT ual.user_id) as unique_users,
        COUNT(DISTINCT DATE(activity_timestamp)) as days_active
      FROM user_activity_logs ual
      JOIN users u ON ual.user_id = u.user_id
      WHERE activity_timestamp > ${timeFilter}
    `;

    // Add location filter if provided
    if (userLocation) {
      query += ` AND u.location = '${userLocation}'`;
    }

    query += `
      GROUP BY activity_type
      ORDER BY count DESC
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (err) {
      logger.error(`Failed to get activity stats: ${err.message}`);
      return [];
    }
  }

  /**
   * Clear old activity logs (retention policy)
   */
  static async purgeOldLogs(daysOld = 90) {
    const query = `
      DELETE FROM user_activity_logs
      WHERE activity_timestamp < NOW() - INTERVAL '${daysOld} DAYS'
    `;
    try {
      const result = await pool.query(query);
      logger.info(`Purged ${result.rowCount} activity logs older than ${daysOld} days`);
      return result.rowCount;
    } catch (err) {
      logger.error(`Failed to purge old logs: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get session information for a user
   */
  static async getUserSession(userId) {
    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.full_name,
        u.role,
        u.location,
        (SELECT activity_timestamp FROM user_activity_logs 
         WHERE user_id = u.user_id AND activity_type = 'LOGIN' 
         ORDER BY activity_timestamp DESC LIMIT 1) as last_login,
        (SELECT activity_timestamp FROM user_activity_logs 
         WHERE user_id = u.user_id AND activity_type = 'LOGOUT' 
         ORDER BY activity_timestamp DESC LIMIT 1) as last_logout,
        (SELECT activity_timestamp FROM user_activity_logs 
         WHERE user_id = u.user_id 
         ORDER BY activity_timestamp DESC LIMIT 1) as last_activity
      FROM users u
      WHERE u.user_id = $1
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (err) {
      logger.error(`Failed to get user session: ${err.message}`, { userId });
      return null;
    }
  }
}

module.exports = UserActivityService;
