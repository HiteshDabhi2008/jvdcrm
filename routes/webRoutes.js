const express = require('express');
const passport = require('passport');
const router = express.Router();

const { isAuthenticated, isGuest } = require('../middleware/auth');
const { isHead } = require('../middleware/rbac');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerUser, logoutUser } = require('../controllers/authController');
const { createCase, updateCase, lookupCase } = require('../controllers/caseController');
const Case = require('../models/Case');

// ── Public Pages ──
router.get('/', (req, res) => res.render('index.html'));
router.get('/dashboard', (req, res) => res.render('dashboard.html'));

// ── Authentication Pages & Handlers ──
router.get('/login', isGuest, (req, res) => res.render('login.html'));

router.post('/login', authLimiter, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error', info && info.message ? info.message : '⛔ Invalid username or password.');
            return res.redirect('/login');
        }
        req.logIn(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            req.flash('success', `✅ Welcome back, ${user.full_name}!`);
            res.redirect('/dashboard');
        });
    })(req, res, next);
});

router.get('/register', isGuest, (req, res) => res.render('register.html'));
router.post('/register', authLimiter, registerUser);

// Google OAuth
router.get('/auth/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        req.flash('error', 'ℹ️ Google OAuth 2.0 is not configured on this server. Please sign in with your staff username & password, or configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
        return res.redirect('/login');
    }
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect('/login');
    }
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, () => {
        req.flash('success', `✅ Signed in with Google as ${req.user.full_name}!`);
        res.redirect('/dashboard');
    });
});

router.get('/logout', logoutUser);

// ── Protected Pages ──

// Staff Profile
router.get('/profile', isAuthenticated, (req, res) => {
    res.render('profile.html');
});

// Case Entry
router.get('/entry', isAuthenticated, (req, res) => {
    res.render('entry.html');
});
router.post('/entry/save', isAuthenticated, createCase);
router.post('/entry/update', isAuthenticated, updateCase);
router.get('/entry/lookup', isAuthenticated, lookupCase);

// View Records (Accessible by all authenticated staff, export restricted to HEAD)
router.get('/view', isAuthenticated, (req, res) => {
    res.render('view.html');
});

// Success Page after Save/Update
router.get('/success/:reg_no', isAuthenticated, async (req, res, next) => {
    try {
        const rawReg = (req.params.reg_no || '').trim();
        const safePattern = new RegExp(`^${rawReg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const c = await Case.findOne({ reg_no: safePattern }).lean();
        res.render('success.html', { reg_no: c ? c.reg_no : rawReg, case: c });
    } catch (err) {
        next(err);
    }
});

// Printable Hospital Case Sheet
router.get('/print/:reg_no', isAuthenticated, async (req, res, next) => {
    try {
        const rawReg = (req.params.reg_no || '').trim();
        const safePattern = new RegExp(`^${rawReg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const c = await Case.findOne({ reg_no: safePattern }).lean();

        if (!c) {
            req.flash('error', `⚠️ Case "${rawReg}" not found.`);
            return res.redirect('/dashboard');
        }

        const addressParts = [c.village, c.city, c.district, c.state].filter(Boolean);
        const address = addressParts.join(', ');

        res.render('print_case.html', { case: c, address });
    } catch (err) {
        next(err);
    }
});

// Administration Portal (HEAD Only)
router.get('/admin', isAuthenticated, isHead, (req, res) => {
    res.render('admin.html');
});

module.exports = router;
