const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { recordAudit } = require('../services/auditService');

const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || 'edufunfoundation.in').toLowerCase();
const HEAD_ADMIN_EMAIL = (process.env.HEAD_ADMIN_EMAIL || 'info@edufunfoundation.in').toLowerCase();

// Initialize Passport Strategies
function initPassport() {
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            const cleanUsername = (username || '').trim().toLowerCase();
            const user = await User.findOne({ username: cleanUsername });
            if (!user) {
                return done(null, false, { message: '⛔ Invalid username or password.' });
            }

            if (user.status === 'blocked') {
                return done(null, false, { message: '⛔ This account has been suspended or blocked by an administrator.' });
            }

            if (!user.password) {
                return done(null, false, { message: 'ℹ️ This account was registered with Google. Please use "Continue with Google".' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: '⛔ Invalid username or password.' });
            }

            user.last_login = new Date();
            await user.save();

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback'
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const email = (profile.emails && profile.emails[0] ? profile.emails[0].value : '').toLowerCase();

                // Enforce organizational email domain restriction if configured
                if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
                    return done(null, false, { 
                        message: `⛔ Access restricted. Only @${ALLOWED_DOMAIN} accounts are authorized for JVD CRM.` 
                    });
                }

                let user = await User.findOne({ email });
                if (!user && profile.id) {
                    user = await User.findOne({ googleId: profile.id });
                }

                if (user && user.status === 'blocked') {
                    return done(null, false, { message: '⛔ Your Google account has been suspended or blocked by an administrator.' });
                }

                const userCount = await User.countDocuments({});
                const isHeadAdmin = (email === HEAD_ADMIN_EMAIL) || (userCount === 0);
                const assignedRole = isHeadAdmin ? 'head' : 'employee';
                const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

                if (!user) {
                    user = new User({
                        full_name: profile.displayName || email.split('@')[0],
                        username: (email.split('@')[0] + '_' + Math.floor(1000 + Math.random() * 9000)).toLowerCase(),
                        email: email,
                        role: assignedRole,
                        status: 'active',
                        googleId: profile.id,
                        avatar: avatarUrl,
                        last_login: new Date()
                    });
                    await user.save();

                    await recordAudit({
                        actor: user,
                        action: 'USER_REGISTRATION',
                        target: user.email,
                        details: `Staff member onboarded via Google Workspace (@${ALLOWED_DOMAIN}) with initial role "${assignedRole}"`
                    });
                } else {
                    user.googleId = profile.id;
                    if (profile.displayName) user.full_name = profile.displayName;
                    if (avatarUrl) user.avatar = avatarUrl;
                    user.last_login = new Date();
                    await user.save();
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }));
    }

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
}

// Compulsory Google Workspace Registration Handler
async function registerUser(req, res, next) {
    try {
        req.flash('error', `⛔ Manual registration is disabled. Staff registration is compulsory through Google Workspace (@${ALLOWED_DOMAIN}). Please click "Register & Onboard with Google (@${ALLOWED_DOMAIN})".`);
        return res.redirect('/register');
    } catch (err) {
        next(err);
    }
}

// Current User API
function getCurrentUserApi(req, res) {
    if (!req.isAuthenticated() || !req.user) {
        return res.json({ authenticated: false });
    }
    res.json({
        authenticated: true,
        user: {
            id: req.user._id,
            full_name: req.user.full_name,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
            status: req.user.status,
            avatar: req.user.avatar,
            last_login: req.user.last_login
        }
    });
}

// Logout Handler
async function logoutUser(req, res) {
    if (req.user) {
        await recordAudit({
            req,
            action: 'LOGOUT',
            targetType: 'USER',
            targetId: req.user.username,
            details: { full_name: req.user.full_name }
        });
    }

    req.logout((err) => {
        req.flash('success', '👋 You have signed out successfully.');
        res.redirect('/dashboard');
    });
}

module.exports = {
    initPassport,
    registerUser,
    getCurrentUserApi,
    logoutUser
};
