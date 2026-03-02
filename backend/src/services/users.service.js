const UserModel = require('../models/user.model');
const AuthService = require('./auth.service');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const NotificationService = require('./notification.service');
const db = require('../config/database');

const UsersService = {
    /**
     * Get formatted user profile
     */
    async getProfile(user) {
        return user;
    },

    /**
     * Update current user profile
     * Securely allows users to update their own info (email, name, password)
     */
    async updateMe(userId, payload) {
        const { password, ...updates } = payload;

        // Hash password if provided
        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            await UserModel.updatePassword(userId, passwordHash);
        }

        // Update other fields
        if (Object.keys(updates).length > 0) {
            // Refined Identity Sync Logic
            // 1. Sync first/last names if full_name is provided and not an email
            if (updates.full_name && !updates.full_name.includes('@')) {
                if (!updates.first_name || !updates.last_name) {
                    const parts = updates.full_name.trim().split(/\s+/);
                    updates.first_name = parts[0] || "";
                    updates.last_name = parts.slice(1).join(" ") || "";
                }
            }

            // 2. Sync full_name if first_name/last_name provided but full_name is not
            if ((updates.first_name || updates.last_name) && !updates.full_name) {
                const first = updates.first_name || "";
                const last = updates.last_name || "";
                updates.full_name = `${first} ${last}`.trim();
            }

            return await UserModel.updateUser(userId, updates);
        }

        // If only password was updated (or nothing), return the user record
        return await UserModel.findById(userId);
    },

    /**
     * List users with optional filtering
     */
    async listUsers({ role, location, search, archived = null }) {
        return await UserModel.listUsers({ role, location, search, archived });
    },

    /**
     * Create a new user
     * Delegates to AuthService.register but kept here for resource consistency
     */
    async createUser(payload) {
        const user = await AuthService.register(payload);

        // Auto-assign to regional teams if target is an IT Agent
        if (user.role === 'it_agent' && user.location) {
            await this._assignToRegionalTeams(user.user_id, user.location);
        }

        return user;
    },

    /**
     * Update user details
     * Handles complex logic for role changes, location updates, and password updates
     */
    async updateUser(userId, payload, actingUser = null) {
        // 1. Check if user exists
        const currentUser = await UserModel.findById(userId);
        if (!currentUser) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        const { password, ...updates } = payload;
        let temporaryPassword = null;
        let message = null;

        // Treat password as provided only when a non-empty string is given
        const passwordProvided = typeof password === 'string' && password.trim() !== '';

        // Prevent accidental overwrite of internal password hash via payload
        if (Object.prototype.hasOwnProperty.call(updates, 'password_hash')) {
            delete updates.password_hash;
        }

        // 2. Check for role change to privileged role (promotion from end_user)
        const isChangingToPrivilegedRole = updates.role &&
            ['it_agent', 'it_manager', 'system_admin'].includes(updates.role) &&
            currentUser.role === 'end_user';
        const isArchiving = Object.prototype.hasOwnProperty.call(updates, 'is_active') &&
            updates.is_active === false &&
            currentUser.is_active === true;

        if (isArchiving && ['it_agent', 'it_manager', 'system_admin'].includes(currentUser.role)) {
            // Archiving a privileged user should remove privileged role traces by default.
            updates.role = 'end_user';
        }

        const isDemotingToEndUser = updates.role === 'end_user' &&
            ['it_agent', 'it_manager', 'system_admin'].includes(currentUser.role);

        if (isChangingToPrivilegedRole) {
            if (passwordProvided) {
                // Admin provided an explicit non-empty password - use it
                const passwordHash = await bcrypt.hash(password, 10);
                await UserModel.updatePassword(userId, passwordHash);
            } else {
                // Generate a password reset token for promotions instead of forcing a password change
                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                try {
                    await db.query(
                        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                        [userId, token, expiresAt]
                    );
                } catch (err) {
                    console.error('Failed to store password reset token for promotion:', err);
                }

                // Send Email Notice (Non-blocking) with reset link token
                NotificationService.sendPasswordResetNotice({
                    user: currentUser,
                    token,
                }).catch(err => {
                    console.error('Failed to send role change password reset notice:', err);
                });

                message = 'User role changed to privileged role. A password reset link has been sent to the user.';
            }
        } else if (passwordProvided) {
            const passwordHash = await bcrypt.hash(password, 10);
            await UserModel.updatePassword(userId, passwordHash);
        }

        // 3. Archive handling: if an admin deactivates a user, mark archived_at/archived_by
        if (Object.prototype.hasOwnProperty.call(updates, 'is_active')) {
            // If actingUser is provided and is a system_admin performing a deactivation
            if (actingUser && actingUser.role === 'system_admin') {
                if (updates.is_active === false && currentUser.is_active === true) {
                    updates.archived_at = new Date();
                    updates.archived_by = actingUser.user_id;
                }
                // If re-activating a user, clear archived fields
                if (updates.is_active === true) {
                    updates.archived_at = null;
                    updates.archived_by = null;
                }
            }
        }

        // 4. Update other fields
        // Refined Identity Sync Logic
        // 1. Sync first/last names if full_name is provided and not an email
        if (updates.full_name && !updates.full_name.includes('@')) {
            if (!updates.first_name || !updates.last_name) {
                const parts = updates.full_name.trim().split(/\s+/);
                updates.first_name = parts[0] || "";
                updates.last_name = parts.slice(1).join(" ") || "";
            }
        }

        // 2. Sync full_name if first_name/last_name provided but full_name is not
        if ((updates.first_name || updates.last_name) && !updates.full_name) {
            const first = updates.first_name || "";
            const last = updates.last_name || "";
            updates.full_name = `${first} ${last}`.trim();
        }

        const updatedUser = await UserModel.updateUser(userId, updates);

        // 4. Handle team auto-assignment on role or location change
        const roleChangedToAgent = updates.role === 'it_agent' && currentUser.role !== 'it_agent';
        const locationChanged = updates.location && updates.location !== currentUser.location;
        const isTargetAgent = updatedUser.role === 'it_agent';

        if (isTargetAgent && (roleChangedToAgent || locationChanged)) {
            await this._assignToRegionalTeams(updatedUser.user_id, updatedUser.location);
        }

        // On demotion or archive, remove technical team/access traces.
        if (isDemotingToEndUser || isArchiving) {
            const TicketsModel = require('../models/tickets.model');
            try {
                await TicketsModel.deactivateMembershipsForUser(updatedUser.user_id);
                await TicketsModel.removeUserAsTeamLead(updatedUser.user_id);
                await TicketsModel.clearAssignmentsForUser(updatedUser.user_id);
            } catch (cleanupErr) {
                console.error(`Failed to clean up technical memberships for offboarded user ${updatedUser.user_id}:`, cleanupErr);
            }
        }

        return {
            user: updatedUser,
            temporary_password: temporaryPassword,
            message,
        };
    },

    /**
     * Helper to assign a user to all teams in a specific location
     * @private
     */
    async _assignToRegionalTeams(userId, location) {
        if (!location) return;
        const TicketsModel = require('../models/tickets.model');
        try {
            const teams = await TicketsModel.listTeamsByLocation(location);
            if (teams && teams.length > 0) {
                for (const team of teams) {
                    await TicketsModel.addMemberToTeam(userId, team.team_id);
                }
                console.log(`Successfully auto-assigned user ${userId} to ${teams.length} teams in ${location}`);
            }
        } catch (err) {
            console.error(`Failed to auto-assign user ${userId} to teams in ${location}:`, err);
        }
    },

    /**
     * Reset password for a user (Admin only)
     */
    async resetPassword(userId) {
        const user = await UserModel.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        // Create a password reset token and send a reset link (do not overwrite password)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        try {
            await db.query(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [userId, token, expiresAt]
            );
        } catch (err) {
            console.error('Failed to store password reset token:', err);
        }

        // Send Email Notice (Non-blocking) with reset link token
        NotificationService.sendPasswordResetNotice({
            user,
            token,
        }).catch(err => {
            console.error('Failed to send password reset notice:', err);
        });

        return {
            user,
            message: 'Password reset initiated. A password reset link has been sent to the user.'
        };
    },

    /**
     * Add an existing user to a team by email
     * Enforces role and location boundaries for Managers
     */
    async addTeamMemberByEmail({ email, managerId, managerLocation }) {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            const error = new Error('No user found with this email address');
            error.status = 404;
            throw error;
        }

        if (user.role !== 'it_agent') {
            const error = new Error('Only IT Agents can be added to the technical team');
            error.status = 400;
            throw error;
        }

        if (managerLocation && user.location !== managerLocation) {
            const error = new Error(`Location mismatch: You can only add agents from the ${managerLocation} region`);
            error.status = 403;
            throw error;
        }

        // Import TicketsModel dynamically to avoid circular dependency if any exists or just use it
        const TicketsModel = require('../models/tickets.model');
        const teams = await TicketsModel.listTeamsByLead(managerId);

        if (!teams || teams.length === 0) {
            const error = new Error('You do not have any teams assigned to lead');
            error.status = 403;
            throw error;
        }

        const membership = await TicketsModel.addMemberToTeam(user.user_id, teams[0].team_id);
        return { user, team: teams[0], membership };
    },

    async listManagedTeamMembers({ managerId }) {
        const TicketsModel = require('../models/tickets.model');
        const teams = await TicketsModel.listTeamsByLead(managerId);
        if (!teams || teams.length === 0) return [];
        const teamIds = teams.map((team) => team.team_id);
        return TicketsModel.listActiveMembersByTeamIds(teamIds);
    },

    async removeTeamMember({ userId, managerId, managerLocation }) {
        const user = await UserModel.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        if (user.role !== 'it_agent') {
            const error = new Error('Only IT Agents can be removed from the technical team');
            error.status = 400;
            throw error;
        }

        if (managerLocation && user.location !== managerLocation) {
            const error = new Error(`Location mismatch: You can only manage agents from the ${managerLocation} region`);
            error.status = 403;
            throw error;
        }

        const TicketsModel = require('../models/tickets.model');
        const teams = await TicketsModel.listTeamsByLead(managerId);
        if (!teams || teams.length === 0) {
            const error = new Error('You do not have any teams assigned to lead');
            error.status = 403;
            throw error;
        }

        const teamIds = teams.map((team) => team.team_id);
        const removedMemberships = await TicketsModel.removeMemberFromTeams(userId, teamIds);
        if (!removedMemberships.length) {
            const error = new Error('This agent is not currently part of your team');
            error.status = 404;
            throw error;
        }

        // Remove open assignments under the manager's teams so removed members
        // no longer receive P1/escalation notices tied to those team tickets.
        await TicketsModel.clearAssignmentsForUserInTeams(userId, teamIds);

        return { user, removed_count: removedMemberships.length };
    },

    async deleteUser(userId, actingUser, { force = false } = {}) {
        if (!actingUser || actingUser.role !== 'system_admin') {
            const error = new Error('Forbidden');
            error.status = 403;
            throw error;
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        if (user.user_id === actingUser.user_id) {
            const error = new Error('You cannot remove your own account');
            error.status = 400;
            throw error;
        }

        if (user.role === 'system_admin') {
            const adminCount = await UserModel.countSystemAdmins();
            if (adminCount <= 1) {
                const error = new Error('Cannot remove the last active system admin');
                error.status = 400;
                throw error;
            }
        }

        // Require deactivation/archive first to avoid accidental hard deletion.
        if (!force && user.is_active === true && !user.archived_at) {
            const error = new Error('User must be deactivated/archived first before removal');
            error.status = 400;
            throw error;
        }

        if (force) {
            const client = await db.connect();
            try {
                await client.query('BEGIN');

                // Remove self-references from users table
                await client.query('UPDATE users SET created_by = NULL WHERE created_by = $1', [userId]);
                await client.query('UPDATE users SET updated_by = NULL WHERE updated_by = $1', [userId]);
                await client.query('UPDATE users SET archived_by = NULL WHERE archived_by = $1', [userId]);

                // Team ownership and memberships
                await client.query('UPDATE teams SET team_lead_id = NULL WHERE team_lead_id = $1', [userId]);
                await client.query('UPDATE team_members SET is_active = false WHERE user_id = $1', [userId]);

                // Ticket ownership and references
                await client.query('UPDATE tickets SET user_id = $2 WHERE user_id = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE tickets SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
                await client.query('UPDATE tickets SET assigned_by = NULL WHERE assigned_by = $1', [userId]);
                await client.query('UPDATE tickets SET resolved_by = NULL WHERE resolved_by = $1', [userId]);
                await client.query('UPDATE tickets SET closed_by = NULL WHERE closed_by = $1', [userId]);
                await client.query('UPDATE tickets SET overridden_by = NULL WHERE overridden_by = $1', [userId]);

                await client.query('UPDATE ticket_comments SET user_id = $2 WHERE user_id = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE ticket_comments SET edited_by = NULL WHERE edited_by = $1', [userId]);
                await client.query('UPDATE ticket_attachments SET uploaded_by = $2 WHERE uploaded_by = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE ticket_status_history SET changed_by = $2 WHERE changed_by = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE ticket_escalations SET escalated_by = $2 WHERE escalated_by = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE ticket_escalations SET resolved_by = $2 WHERE resolved_by = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE audit_logs SET user_id = $2 WHERE user_id = $1', [userId, actingUser.user_id]);

                // Knowledge base
                await client.query('UPDATE knowledge_base_articles SET author_id = $2 WHERE author_id = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE kb_article_versions SET changed_by = $2 WHERE changed_by = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE kb_article_feedback SET user_id = NULL WHERE user_id = $1', [userId]);

                // Change management and approvals
                await client.query('UPDATE change_requests SET requested_by = $2 WHERE requested_by = $1', [userId, actingUser.user_id]);
                await client.query('DELETE FROM change_approvers WHERE user_id = $1', [userId]);
                await client.query('UPDATE ticket_priority_override_requests SET requested_by = $2 WHERE requested_by = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE ticket_priority_override_requests SET reviewed_by = NULL WHERE reviewed_by = $1', [userId]);

                // Service requests and assets
                await client.query('UPDATE service_requests SET requested_by = $2 WHERE requested_by = $1', [userId, actingUser.user_id]);
                await client.query('UPDATE service_requests SET approver_id = NULL WHERE approver_id = $1', [userId]);
                await client.query('UPDATE it_assets SET assigned_user_id = NULL WHERE assigned_user_id = $1', [userId]);

                const deletedRes = await client.query(
                    'DELETE FROM users WHERE user_id = $1 RETURNING user_id, email, full_name, role',
                    [userId]
                );

                await client.query('COMMIT');
                const deleted = deletedRes.rows[0] || null;
                if (!deleted) {
                    const error = new Error('User not found');
                    error.status = 404;
                    throw error;
                }
                return { user: deleted, forced: true };
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        }

        try {
            const deleted = await UserModel.deleteUser(userId);
            if (!deleted) {
                const error = new Error('User not found');
                error.status = 404;
                throw error;
            }
            return { user: deleted };
        } catch (err) {
            if (err.code === '23503') {
                const error = new Error('Cannot remove user with linked records (tickets, audit logs, assets, or approvals)');
                error.status = 409;
                throw error;
            }
            throw err;
        }
    }
};

module.exports = UsersService;
