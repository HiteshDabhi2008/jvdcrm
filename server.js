require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nunjucks = require('nunjucks');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const path = require('path');

const User = require('./models/User');
const Case = require('./models/Case');

const app = express();

// Database Connection with graceful fallback to local MongoDB
let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jvd_crm';
if (mongoUri.includes('user:password@cluster.mongodb.net')) {
    console.log('⚠️ Placeholder MongoDB URI detected. Falling back to local MongoDB at mongodb://127.0.0.1:27017/jvd_crm');
    mongoUri = 'mongodb://127.0.0.1:27017/jvd_crm';
}

mongoose.connect(mongoUri)
    .then(() => console.log(`[JVD] MongoDB Connected successfully to ${mongoUri}`))
    .catch(err => console.error('[JVD] MongoDB Connection Error:', err.message));

// Configure Nunjucks
const env = nunjucks.configure('.', {
    autoescape: true,
    express: app,
    noCache: true // Useful for dev
});

// Custom Nunjucks extension to support Jinja2 {% with var = expr %} ... {% endwith %}
function WithExtension() {
    this.tags = ['with'];

    this.parse = function(parser, nodes, lexer) {
        const tok = parser.nextToken();
        const args = parser.parseSignature(null, true);
        parser.advanceAfterBlockEnd(tok.value);

        const body = parser.parseUntilBlocks('endwith');
        parser.advanceAfterBlockEnd();

        return new nodes.CallExtension(this, 'run', args, [body]);
    };

    this.run = function(context, ...args) {
        const body = args.pop();
        const kwargs = args[args.length - 1];
        const ctx = context.ctx;
        const oldValues = {};
        if (kwargs && typeof kwargs === 'object') {
            for (const [k, v] of Object.entries(kwargs)) {
                oldValues[k] = ctx[k];
                ctx[k] = v;
            }
        }
        const res = body();
        if (kwargs && typeof kwargs === 'object') {
            for (const k of Object.keys(kwargs)) {
                if (oldValues[k] !== undefined) {
                    ctx[k] = oldValues[k];
                } else {
                    delete ctx[k];
                }
            }
        }
        return new nunjucks.runtime.SafeString(res);
    };
}
env.addExtension('WithExtension', new WithExtension());

// Custom filters for Jinja compatibility
env.addFilter('slice', function(val, start, end) {
    if (typeof val === 'string' || Array.isArray(val)) {
        return val.slice(start, end);
    }
    return val;
});
env.addFilter('tojson', function(obj) {
    return new nunjucks.runtime.SafeString(JSON.stringify(obj));
});

// Global standard options
const STATUS_OPTIONS = [
    "Under Treatment",
    "Site Treatment",
    "JVD Treatment",
    "Release",
    "Death",
    "Run Away"
];
env.addGlobal('status_options', STATUS_OPTIONS);

const SPECIES_MAP = {
    "Domestic": ["Dog","Cow","Buffalo","Puppy","Goat","Sheep","Horse",
                 "Donkey","Rabbit","Cat","Ox","Duck","Hen","Turkey",
                 "Parrot","Love Bird","Cockatiel","Budgerigar"],
    "Wild":     ["Nilgai","Monkey","Monitor Lizard","Snake","Fox","Jackal",
                 "Sparrow","Pigeon","Kabar (Myna)","Peacock","Eagle",
                 "Deer","Leopard","Wolf","Bear"]
};
env.addGlobal('species_map', SPECIES_MAP);

// Polyfill url_for to keep templates completely compatible
const routesMap = {
    'home': '/',
    'login': '/login',
    'register': '/register',
    'dashboard': '/dashboard',
    'entry': '/entry',
    'view_records': '/view',
    'entry_save': '/entry/save',
    'entry_update': '/entry/update',
    'entry_lookup': '/entry/lookup',
    'api_cases': '/api/cases',
    'logout': '/logout',
    'google.login': '/auth/google'
};

const urlForPolyfill = function(name, kwargs) {
    if (name === 'static') {
        return '/static/' + (kwargs ? kwargs.filename : '');
    }
    if (name === 'print_case' && kwargs && kwargs.reg_no) {
        return '/print/' + kwargs.reg_no;
    }
    if (name === 'success' && kwargs && kwargs.reg_no) {
        return '/success/' + kwargs.reg_no;
    }
    return routesMap[name] || '#';
};
urlForPolyfill.__doc__ = { 'google.login': true };
env.addGlobal('url_for', urlForPolyfill);

app.set('view engine', 'html');

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, '.')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session config
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.FLASK_SECRET_KEY || 'jvd_edufun_dev_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(flash());

// Passport Config
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const user = await User.findOne({ username });
        if (!user) return done(null, false, { message: '⛔ Invalid username or password.' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: '⛔ Invalid username or password.' });
        
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
            const ALLOWED_DOMAIN = "edufunfoundation.in";
            
            if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
                return done(null, false, { message: `⛔ Only @${ALLOWED_DOMAIN} accounts are allowed.` });
            }

            let user = await User.findOne({ email });
            if (!user) {
                user = await User.findOne({ googleId: profile.id });
            }

            if (!user) {
                const headEmail = "info@edufunfoundation.in";
                const role = (email === headEmail) ? "head" : "employee";

                user = new User({
                    full_name: profile.displayName || email.split('@')[0],
                    username: email.split('@')[0],
                    email: email,
                    role: role,
                    googleId: profile.id
                });
                await user.save();
            } else {
                user.googleId = profile.id;
                user.full_name = profile.displayName || user.full_name;
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

// Middleware for globals in templates
app.use((req, res, next) => {
    res.locals.current_user = req.user;
    
    // Format flash messages for Jinja compatibility in Nunjucks
    res.locals.get_flashed_messages = function(options) {
        let messages = [];
        const errs = req.flash('error');
        const succ = req.flash('success');
        if (options && options.with_categories) {
            errs.forEach(m => messages.push(['error', m]));
            succ.forEach(m => messages.push(['success', m]));
        } else {
            messages = errs.concat(succ);
        }
        return messages;
    };
    next();
});

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    req.flash('error', '⚠️ Please sign in to access the system.');
    res.redirect('/login');
};

const isHead = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'head') return next();
    req.flash('error', '⛔ Access denied. Head administrator privileges required.');
    res.redirect('/dashboard');
};

// Routes
app.get('/', (req, res) => res.render('index.html'));

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('login.html');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
    successFlash: '✅ Signed in successfully!'
}));

app.get('/register', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('register.html');
});

app.post('/register', async (req, res) => {
    try {
        const { full_name, username, email, role, password, confirm_password } = req.body;
        
        if (password !== confirm_password) {
            req.flash('error', '⛔ Passwords do not match.');
            return res.redirect('/register');
        }

        const existing = await User.findOne({ username: (username || '').trim() });
        if (existing) {
            req.flash('error', '⛔ Username already exists.');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            full_name: (full_name || '').trim(),
            username: (username || '').trim(),
            email: email ? email.trim() : undefined,
            role: role || 'employee',
            password: hashedPassword
        });
        await newUser.save();
        
        req.flash('success', '✅ Account created successfully. Please sign in.');
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.flash('error', '⚠️ Registration failed. ' + (error.message || ''));
        res.redirect('/register');
    }
});

app.get('/dashboard', (req, res) => res.render('dashboard.html'));

app.get('/entry', isAuthenticated, (req, res) => res.render('entry.html'));

app.get('/view', isAuthenticated, isHead, (req, res) => res.render('view.html'));

// API Routes
app.get('/api/cases', isAuthenticated, async (req, res) => {
    try {
        let query = {};
        const { contact_no, animal_type, species, status, from_date, to_date } = req.query;

        if (contact_no) query.contact_no = { $regex: contact_no.trim(), $options: 'i' };
        if (animal_type) query.animal_type = animal_type.trim();
        if (species) query.species = { $regex: species.trim(), $options: 'i' };
        if (status) query.status = status.trim();
        
        if (from_date || to_date) {
            query.post_time = {};
            if (from_date) query.post_time.$gte = from_date;
            if (to_date) {
                const nextDay = new Date(new Date(to_date).getTime() + 86400000).toISOString().slice(0, 10);
                query.post_time.$lt = nextDay;
            }
        }

        const cases = await Case.find(query).sort({ _id: -1 }).lean();
        res.json({ count: cases.length, cases });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

app.get('/entry/lookup', isAuthenticated, async (req, res) => {
    try {
        const reg_no = (req.query.reg_no || '').trim();
        if (!reg_no) return res.json({ found: false });

        const safeRegex = new RegExp(`^${reg_no.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const c = await Case.findOne({ reg_no: safeRegex }).lean();
        if (c) {
            res.json({ found: true, case: c });
        } else {
            res.json({ found: false });
        }
    } catch (error) {
        res.status(500).json({ found: false, error: 'Server error' });
    }
});

// Helper for generating reg_no (e.g. JVD.2026.0001)
async function generateRegNo() {
    const year = new Date().getFullYear();
    const prefix = `JVD.${year}.`;
    const escapedPrefix = `^JVD\\.${year}\\.`;
    
    const lastCase = await Case.findOne({ reg_no: { $regex: new RegExp(escapedPrefix, 'i') } })
        .sort({ reg_no: -1, _id: -1 });
    let nextNum = 1;
    if (lastCase && lastCase.reg_no) {
        const parts = lastCase.reg_no.split('.');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

app.post('/entry/save', isAuthenticated, async (req, res) => {
    try {
        const newRegNo = await generateRegNo();
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

        const newCase = new Case({
            ...req.body,
            reg_no: newRegNo,
            post_time: nowStr,
            last_edited_by: req.user.full_name,
            last_edited_at: nowStr
        });
        
        await newCase.save();
        res.redirect(`/success/${newRegNo}`);
    } catch (error) {
        console.error(error);
        req.flash('error', '⚠️ Failed to save case. ' + (error.message || ''));
        res.redirect('/entry');
    }
});

app.post('/entry/update', isAuthenticated, async (req, res) => {
    try {
        const reg_no = (req.body.reg_no || '').trim();
        if (!reg_no) {
            req.flash('error', '⚠️ Missing Registration Number for update.');
            return res.redirect('/entry');
        }

        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const safeRegex = new RegExp(`^${reg_no.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

        const updated = await Case.findOneAndUpdate(
            { reg_no: safeRegex },
            {
                ...req.body,
                reg_no: reg_no.toUpperCase(),
                last_edited_by: req.user.full_name,
                last_edited_at: nowStr
            },
            { returnDocument: 'after' }
        );

        if (!updated) {
            req.flash('error', `⚠️ Case "${reg_no}" not found in database.`);
            return res.redirect('/entry');
        }

        req.flash('success', `✅ Case ${updated.reg_no} updated successfully!`);
        res.redirect(`/success/${updated.reg_no}`);
    } catch (error) {
        console.error(error);
        req.flash('error', '⚠️ Failed to update case. ' + (error.message || ''));
        res.redirect('/entry');
    }
});

app.get('/success/:reg_no', isAuthenticated, async (req, res) => {
    const reg_no = (req.params.reg_no || '').trim();
    const safeRegex = new RegExp(`^${reg_no.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const c = await Case.findOne({ reg_no: safeRegex }).lean();
    res.render('success.html', { reg_no: c ? c.reg_no : reg_no, case: c });
});

app.get('/print/:reg_no', isAuthenticated, async (req, res) => {
    const reg_no = (req.params.reg_no || '').trim();
    const safeRegex = new RegExp(`^${reg_no.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const c = await Case.findOne({ reg_no: safeRegex }).lean();
    if (!c) {
        req.flash('error', '⚠️ Case not found.');
        return res.redirect('/dashboard');
    }
    const address = `${c.village || ''}, ${c.city || ''}, ${c.district || ''}, ${c.state || ''}`.replace(/^[,\s]+|[,\s]+$/g, '');
    res.render('print_case.html', { case: c, address });
});

// Google Auth with graceful safety check
app.get('/auth/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        req.flash('error', '⚠️ Google Authentication is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or sign in with your username & password.');
        return res.redirect('/login');
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
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

app.get('/logout', (req, res) => {
    req.logout((err) => {
        req.flash('success', '👋 Logged out successfully.');
        res.redirect('/dashboard');
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[JVD] Server running on http://127.0.0.1:${PORT}`);
});
