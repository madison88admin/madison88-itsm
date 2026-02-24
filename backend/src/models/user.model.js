// User model for PostgreSQL (using pg)
// This is a simple data access layer, not an ORM
const db = require('../config/database');

const UserModel = {
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rows[0];
  },
  async findById(userId) {
    const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    return result.rows[0];
  },
  async create({ email, first_name, last_name, full_name, passwordHash, role, department, location, phone }) {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, full_name, role, department, location, phone, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW()) RETURNING *`,
      [email, passwordHash, first_name, last_name, full_name, role, department, location, phone]
    );
    return result.rows[0];
  },
  async updateLastLogin(userId) {
    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [userId]);
  },

  async listUsers({ role, location, search, archived = null } = {}) {
    const conditions = [];
    const values = [];

    if (role) {
      values.push(role);
      conditions.push(`u.role = $${values.length}`);
    }

    if (location) {
      values.push(location);
      conditions.push(`u.location = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(u.email ILIKE $${values.length} OR u.full_name ILIKE $${values.length})`);
    }

    // archived: 'true' => archived_at IS NOT NULL, 'false' => archived_at IS NULL, null => no filter
    if (archived === 'true') {
      conditions.push(`u.archived_at IS NOT NULL`);
    } else if (archived === 'false') {
      conditions.push(`u.archived_at IS NULL`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT u.user_id, u.email, u.full_name, u.role, u.department, u.location, u.phone, u.is_active, u.archived_at, u.archived_by, u.created_at, a.full_name as archived_by_name
       FROM users u
       LEFT JOIN users a ON u.archived_by = a.user_id
       ${whereClause} ORDER BY u.created_at DESC`,
      values
    );
    return result.rows;
  },

  async updateUser(userId, updates) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

    const result = await db.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE user_id = $${keys.length + 1} RETURNING *`,
      [...values, userId]
    );
    return result.rows[0];
  },

  async updatePassword(userId, passwordHash) {
    const result = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id, email, full_name, role',
      [passwordHash, userId]
    );
    return result.rows[0];
  },

  async listByIds(userIds) {
    if (!userIds || !userIds.length) return [];
    const result = await db.query(
      'SELECT user_id, email, full_name, role FROM users WHERE user_id = ANY($1)',
      [userIds]
    );
    return result.rows;
  },
};

module.exports = UserModel;
