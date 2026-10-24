const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../middleware/auth');
const { isHead } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const { getCurrentUserApi } = require('../controllers/authController');
const { 
    getCasesApi, 
    getCaseDetailsApi, 
    updateStatusApi, 
    toggleArchiveApi 
} = require('../controllers/caseController');
const { getDashboardStatsApi } = require('../controllers/dashboardController');
const { exportExcel, exportPdf } = require('../controllers/exportController');
const { 
    listUsersApi, 
    updateUserRoleApi, 
    updateUserStatusApi, 
    getAuditLogsApi 
} = require('../controllers/adminController');

// Apply general API rate limiting
router.use(apiLimiter);

// ── Health Check ──
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Jivdaya Vatsalya Dham CRM',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ── Authentication Info ──
router.get('/auth/me', getCurrentUserApi);

// ── Cases Endpoints (Authenticated) ──
router.get('/cases', isAuthenticated, getCasesApi);
router.get('/cases/:reg_no', isAuthenticated, getCaseDetailsApi);
router.put('/cases/:reg_no/status', isAuthenticated, updateStatusApi);
router.put('/cases/:reg_no/archive', isAuthenticated, isHead, toggleArchiveApi);

// ── Dashboard Metrics (Authenticated) ──
router.get('/dashboard/stats', isAuthenticated, getDashboardStatsApi);

// ── Server-Side Exports (HEAD Only) ──
router.get('/export/excel', isAuthenticated, isHead, exportExcel);
router.get('/export/pdf', isAuthenticated, isHead, exportPdf);

// ── Administration (HEAD Only) ──
router.get('/users', isAuthenticated, isHead, listUsersApi);
router.put('/users/:userId/role', isAuthenticated, isHead, updateUserRoleApi);
router.put('/users/:userId/status', isAuthenticated, isHead, updateUserStatusApi);
router.get('/audit-logs', isAuthenticated, isHead, getAuditLogsApi);

module.exports = router;
