const helmet = require('helmet');

// Configure Helmet with balanced CSP allowing necessary CDNs, fonts, and inline scripts
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://cdnjs.cloudflare.com",
                "https://apis.google.com",
                "https://www.gstatic.com"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'",
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            imgSrc: [
                "'self'", 
                "data:", 
                "https:", 
                "https://www.gstatic.com"
            ],
            connectSrc: ["'self'"],
            frameSrc: ["'self'", "https://accounts.google.com"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

// Sanitizes input strings to prevent MongoDB operator injection and ReDoS attacks
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
}

// Sanitizes query object by removing any key starting with '$'
function sanitizeQuery(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) {
            delete obj[key];
        } else if (typeof obj[key] === 'object') {
            sanitizeQuery(obj[key]);
        }
    }
    return obj;
}

module.exports = {
    securityHeaders,
    sanitizeString,
    sanitizeQuery
};
