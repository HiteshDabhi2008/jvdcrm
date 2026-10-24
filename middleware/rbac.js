function isHead(req, res, next) {
    if (req.isAuthenticated() && req.user && req.user.role === 'head') {
        return next();
    }
    
    if ((req.originalUrl || req.path).startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(403).json({ success: false, error: 'Access denied. Head administrator privileges required.' });
    }

    req.flash('error', '⛔ Access denied. Head administrator privileges required.');
    res.redirect('/dashboard');
}

function hasRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            if ((req.originalUrl || req.path).startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                return res.status(401).json({ success: false, error: 'Authentication required.' });
            }
            return res.redirect('/login');
        }

        if (req.user && allowedRoles.includes(req.user.role)) {
            return next();
        }

        if ((req.originalUrl || req.path).startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(403).json({ success: false, error: 'Access denied: Insufficient role permissions.' });
        }

        req.flash('error', '⛔ Access denied. Insufficient permissions for this action.');
        res.redirect('/dashboard');
    };
}

module.exports = {
    isHead,
    hasRole
};
