const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { recordAudit } = require('../services/auditService');

// Get all staff users (HEAD only)
async function listUsersApi(req, res) {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, count: users.length, users });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to list users: ' + err.message });
    }
}

// Update User Role (HEAD only)
async function updateUserRoleApi(req, res) {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['employee', 'head'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role specified' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Safety: If current user is modifying themselves, ensure at least one other active head exists
        if (targetUser._id.toString() === req.user._id.toString() && role !== 'head') {
            const headCount = await User.countDocuments({ role: 'head', status: 'active' });
            if (headCount <= 1) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cannot demote the only active Head Administrator.' 
                });
            }
        }

        const oldRole = targetUser.role;
        targetUser.role = role;
        await targetUser.save();

        await recordAudit({
            req,
            action: 'USER_ROLE_CHANGE',
            targetType: 'USER',
            targetId: targetUser.username,
            details: { oldRole, newRole: role }
        });

        res.json({ 
            success: true, 
            message: `User ${targetUser.username} role updated to ${role}.`,
            user: {
                id: targetUser._id,
                username: targetUser.username,
                role: targetUser.role
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Update User Status - Activate / Block (HEAD only)
async function updateUserStatusApi(req, res) {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status specified' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Safety: Prevent head from blocking themselves
        if (targetUser._id.toString() === req.user._id.toString() && status === 'blocked') {
            return res.status(400).json({ 
                success: false, 
                error: 'You cannot block your own active account.' 
            });
        }

        const oldStatus = targetUser.status;
        targetUser.status = status;
        await targetUser.save();

        await recordAudit({
            req,
            action: 'USER_STATUS_CHANGE',
            targetType: 'USER',
            targetId: targetUser.username,
            details: { oldStatus, newStatus: status }
        });

        res.json({ 
            success: true, 
            message: `User ${targetUser.username} status set to ${status}.`,
            user: {
                id: targetUser._id,
                username: targetUser.username,
                status: targetUser.status
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Get paginated Audit Logs (HEAD only)
async function getAuditLogsApi(req, res) {
    try {
        const { action, targetType, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (action && action.trim()) {
            filter.action = action.trim();
        }
        if (targetType && targetType.trim()) {
            filter.target_type = targetType.trim();
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;

        const [total, logs] = await Promise.all([
            AuditLog.countDocuments(filter),
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);

        res.json({
            success: true,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
            logs
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to retrieve audit logs: ' + err.message });
    }
}

module.exports = {
    listUsersApi,
    updateUserRoleApi,
    updateUserStatusApi,
    getAuditLogsApi
};
