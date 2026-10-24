function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        // Enforce account status check
        if (req.user && req.user.status === 'blocked') {
            req.logout((err) => {
                req.flash('error', '⛔ Your account has been suspended or blocked by an administrator.');
                return res.redirect('/login');
            });
            return;
        }
        return next();
    }
    
    // Check if this is an API call vs browser page visit
    if ((req.originalUrl || req.path).startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
    }

    req.flash('error', '⚠️ Please sign in to access the system.');
    res.redirect('/login');
}

function isGuest(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    next();
}

module.exports = {
    isAuthenticated,
    isGuest
};
