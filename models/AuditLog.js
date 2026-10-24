const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    user_name: {
        type: String,
        required: true,
        trim: true
    },
    user_role: {
        type: String,
        default: 'employee'
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN',
            'LOGOUT',
            'CASE_CREATE',
            'CASE_UPDATE',
            'CASE_STATUS_CHANGE',
            'CASE_ARCHIVE',
            'CASE_RESTORE',
            'EXPORT_EXCEL',
            'EXPORT_PDF',
            'USER_ROLE_CHANGE',
            'USER_STATUS_CHANGE',
            'USER_CREATE'
        ],
        index: true
    },
    target_type: {
        type: String,
        enum: ['CASE', 'USER', 'SYSTEM', 'EXPORT'],
        default: 'CASE'
    },
    target_id: {
        type: String,
        trim: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    ip_address: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false
});

AuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
