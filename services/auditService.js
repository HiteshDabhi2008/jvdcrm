const AuditLog = require('../models/AuditLog');

/**
 * Record an action to the audit log safely without interrupting main flow.
 */
async function recordAudit({ req, action, targetType = 'CASE', targetId = '', details = {} }) {
    try {
        const userId = req && req.user ? req.user._id : null;
        const userName = req && req.user ? (req.user.full_name || req.user.username) : 'System/Guest';
        const userRole = req && req.user ? (req.user.role || 'employee') : 'guest';
        
        let ipAddress = '127.0.0.1';
        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
            if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
                ipAddress = ipAddress.split(',')[0].trim();
            }
        }

        const logEntry = new AuditLog({
            user_id: userId,
            user_name: userName,
            user_role: userRole,
            action,
            target_type: targetType,
            target_id: String(targetId),
            details,
            ip_address: ipAddress,
            timestamp: new Date()
        });

        await logEntry.save();
    } catch (err) {
        console.error('[AuditService Error] Failed to write audit log:', err.message);
    }
}

module.exports = {
    recordAudit
};
