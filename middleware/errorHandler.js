function errorHandler(err, req, res, next) {
    // Log the error internally with details
    console.error(`[JVD Error] ${new Date().toISOString()} ${req.method} ${req.originalUrl}:`, err);

    const statusCode = err.status || err.statusCode || 500;
    const userMessage = err.expose || statusCode < 500 ? err.message : 'An unexpected server error occurred. Please try again later.';

    // If API request, return JSON
    if ((req.originalUrl || req.path).startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(statusCode).json({
            success: false,
            error: userMessage,
            code: err.code || 'SERVER_ERROR'
        });
    }

    // Otherwise show flash message and redirect or render friendly error page
    if (req.flash) {
        req.flash('error', `⚠️ ${userMessage}`);
    }
    
    // Redirect back to safe page or dashboard
    res.status(statusCode);
    if (req.headers.referer && !req.headers.referer.includes('/error')) {
        return res.redirect(req.headers.referer);
    }
    res.redirect('/dashboard');
}

module.exports = {
    errorHandler
};
