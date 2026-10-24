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

// Local Register Handler
async function registerUser(req, res, next) {
    try {
        const { full_name, username, email, password, confirm_password } = req.body;

        if (!full_name || !username || !password || !confirm_password) {
            req.flash('error', '⚠️ All required registration fields must be filled.');
            return res.redirect('/register');
        }

        if (password !== confirm_password) {
            req.flash('error', '⛔ Passwords do not match.');
            return res.redirect('/register');
        }

        if (password.length < 6) {
            req.flash('error', '⚠️ Password must be at least 6 characters long.');
            return res.redirect('/register');
        }

        const cleanUsername = username.trim().toLowerCase();
        const existing = await User.findOne({ username: cleanUsername });
        if (existing) {
            req.flash('error', '⛔ Username already exists. Please choose a different one.');
            return res.redirect('/register');
        }

        const cleanEmail = email ? email.trim().toLowerCase() : undefined;
        if (cleanEmail) {
            const existingEmail = await User.findOne({ email: cleanEmail });
            if (existingEmail) {
                req.flash('error', '⛔ An account with this email already exists.');
                return res.redirect('/register');
            }
        }

        // Secure Role Assignment:
        // Do NOT allow user to specify 'head' arbitrarily.
        // First user or matching HEAD_ADMIN_EMAIL gets head, all others employee.
        const userCount = await User.countDocuments({});
        const isHeadAdmin = (cleanEmail && cleanEmail === HEAD_ADMIN_EMAIL) || (userCount === 0);
        const role = isHeadAdmin ? 'head' : 'employee';

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            full_name: full_name.trim(),
            username: cleanUsername,
            email: cleanEmail,
            role,
            status: 'active',
            password: hashedPassword
        });

        await newUser.save();

        await recordAudit({
            req,
            action: 'USER_CREATE',
            targetType: 'USER',
            targetId: newUser.username,
            details: { role: newUser.role, full_name: newUser.full_name }
        });

        req.flash('success', `✅ Account created successfully as ${role.toUpperCase()}. Please sign in.`);
        res.redirect('/login');
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
