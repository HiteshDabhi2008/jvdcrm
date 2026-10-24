require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nunjucks = require('nunjucks');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const path = require('path');

const { securityHeaders } = require('./middleware/security');
const { errorHandler } = require('./middleware/errorHandler');
const { initPassport } = require('./controllers/authController');
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

// ── 1. Database Connection ──
let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jvd_crm';
if (mongoUri.includes('user:password@cluster.mongodb.net')) {
    console.log('⚠️ Placeholder MongoDB URI detected in .env. Falling back to local MongoDB at mongodb://127.0.0.1:27017/jvd_crm');
    mongoUri = 'mongodb://127.0.0.1:27017/jvd_crm';
}

mongoose.connect(mongoUri)
    .then(() => console.log(`[JVD] MongoDB Connected successfully to ${mongoUri}`))
    .catch(err => console.error('[JVD] MongoDB Connection Error:', err.message));

// ── 2. Security Headers & Parsers ──
app.use(securityHeaders);
app.use(cookieParser(process.env.SESSION_SECRET || 'jvd_edufun_dev_2026'));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));

// ── 3. Static Files ──
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, '.')));

// ── 4. Session Configuration ──
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.FLASK_SECRET_KEY || 'jvd_edufun_dev_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    }
}));

app.use(flash());

// ── 5. Passport Authentication ──
initPassport();
app.use(passport.initialize());
app.use(passport.session());

// ── 6. Nunjucks Template Engine Setup ──
const env = nunjucks.configure('.', {
    autoescape: true,
    express: app,
    noCache: !isProduction
});

// Custom Nunjucks extension for Jinja2 {% with var = expr %} ... {% endwith %}
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

// Custom filters
env.addFilter('slice', function(val, start, end) {
    if (typeof val === 'string' || Array.isArray(val)) {
        return val.slice(start, end);
    }
    return val;
});
env.addFilter('tojson', function(obj) {
    return new nunjucks.runtime.SafeString(JSON.stringify(obj));
});

// Standard options
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

// Polyfill url_for for full template compatibility
const routesMap = {
    'home': '/',
    'login': '/login',
    'register': '/register',
    'dashboard': '/dashboard',
    'profile': '/profile',
    'admin': '/admin',
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

// Template locals & flash messaging
app.use((req, res, next) => {
    res.locals.current_user = req.user;
    res.locals.allowed_domain = process.env.ALLOWED_DOMAIN || 'edufunfoundation.in';
    
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

// ── 7. Mount Routes ──
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// ── 8. Error Handling ──
app.use(errorHandler);

// ── 9. Server Initialization ──
const PORT = process.env.PORT || 5000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[JVD CRM] System online and ready at http://127.0.0.1:${PORT}`);
    });
}

module.exports = app;
