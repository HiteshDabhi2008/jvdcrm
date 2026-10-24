require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const { Counter } = require('../models/Counter');
const bcrypt = require('bcrypt');

let server;
let port;

function request(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = Buffer.alloc(0);
            res.on('data', (chunk) => {
                data = Buffer.concat([data, chunk]);
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data.toString('utf8'),
                    rawBody: data
                });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runApiTests() {
    console.log('🧪 Starting API Endpoints Verification Suite...');

    // Start server on ephemeral port for testing
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
    console.log(`✅ Test server running on port ${port}`);

    // 1. Test /api/health
    const healthRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/health',
        method: 'GET'
    });
    console.log('Health response status:', healthRes.statusCode);
    const healthJson = JSON.parse(healthRes.body);
    if (healthRes.statusCode !== 200 || healthJson.status !== 'OK') {
        throw new Error('Health check failed: ' + healthRes.body);
    }
    console.log('✅ 1. /api/health passed:', healthJson);

    // 2. Test /api/auth/me (unauthenticated)
    const meRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/me',
        method: 'GET'
    });
    const meJson = JSON.parse(meRes.body);
    if (meJson.authenticated !== false) {
        throw new Error('Unauthenticated /api/auth/me failed');
    }
    console.log('✅ 2. /api/auth/me (guest) passed');

    // 3. Test Staff Registration (Bootstrap First User as Head)
    const testUsername = 'admin_' + Date.now();
    const regParams = new URLSearchParams({
        full_name: 'Super Admin',
        username: testUsername,
        email: `${testUsername}@edufunfoundation.in`,
        password: 'Password123!',
        confirm_password: 'Password123!'
    }).toString();

    const regRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(regParams)
        }
    }, regParams);

    if (regRes.statusCode !== 302 || !regRes.headers.location.includes('/register')) {
        throw new Error('Registration should redirect to /register with compulsory Google message: ' + regRes.statusCode);
    }
    console.log('✅ 3. Compulsory Google registration verified (manual registration blocked)');

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const createdAdmin = await User.create({
        full_name: 'Super Admin',
        username: testUsername,
        email: `${testUsername}@edufunfoundation.in`,
        password: hashedPassword,
        role: 'head',
        status: 'active'
    });
    console.log('✅ 4. Test admin user verified with role "head"');

    // 4. Test Login & Session Cookie
    const loginParams = new URLSearchParams({
        username: testUsername,
        password: 'Password123!'
    }).toString();

    const loginRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(loginParams)
        }
    }, loginParams);

    if (loginRes.statusCode !== 302 || !loginRes.headers['set-cookie']) {
        throw new Error('Login failed: ' + loginRes.statusCode);
    }
    const sessionCookie = loginRes.headers['set-cookie'][0].split(';')[0];
    console.log('✅ 5. Login passed, session cookie acquired');

    // 5. Test Case Creation via Authenticated POST /entry/save
    const caseData = new URLSearchParams({
        caller_name: 'Bhavik Dave',
        contact_no: '9825123456',
        village: 'Khimat',
        city: 'Dhanera',
        district: 'Banaskantha',
        state: 'Gujarat',
        animal_type: 'Wild',
        species: 'Nilgai',
        sex: 'Male',
        cause: 'Trapped in barbed fence',
        discrimination: 'Deep cuts on hind leg, dehydrated',
        treatment: 'Local anesthesia, deep wound cleaned, stitches applied',
        contribution: '1000',
        status: 'Under Treatment'
    }).toString();

    const saveCaseRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/entry/save',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(caseData),
            'Cookie': sessionCookie
        }
    }, caseData);

    if (saveCaseRes.statusCode !== 302 || !saveCaseRes.headers.location.includes('/success/')) {
        throw new Error('Case creation failed: ' + saveCaseRes.statusCode + ' loc: ' + saveCaseRes.headers.location);
    }
    const createdRegNo = saveCaseRes.headers.location.split('/success/')[1];
    console.log(`✅ 6. Case registered successfully with Reg No: ${createdRegNo}`);

    // 6. Test /api/cases query with filters
    const casesApiRes = await request({
        hostname: '127.0.0.1',
        port,
        path: `/api/cases?animal_type=Wild&species=Nilgai`,
        method: 'GET',
        headers: {
            'Cookie': sessionCookie
        }
    });
    const casesJson = JSON.parse(casesApiRes.body);
    if (!casesJson.success || casesJson.cases.length === 0 || casesJson.cases[0].reg_no !== createdRegNo) {
        throw new Error('Filtered cases query failed: ' + casesApiRes.body);
    }
    console.log('✅ 7. /api/cases filter query passed. Total found:', casesJson.total);

    // 7. Test Quick Status Update PUT /api/cases/:reg_no/status
    const updateStatusRes = await request({
        hostname: '127.0.0.1',
        port,
        path: `/api/cases/${createdRegNo}/status`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        }
    }, { status: 'Release' });

    const statusJson = JSON.parse(updateStatusRes.body);
    if (!statusJson.success || statusJson.case.status !== 'Release') {
        throw new Error('Status update API failed: ' + updateStatusRes.body);
    }
    console.log('✅ 8. Quick status update API passed: Status changed to "Release"');

    // 8. Test /api/dashboard/stats
    const statsRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/dashboard/stats',
        method: 'GET',
        headers: {
            'Cookie': sessionCookie
        }
    });
    const statsJson = JSON.parse(statsRes.body);
    if (!statsJson.success || typeof statsJson.stats.total !== 'number' || statsJson.stats.total < 1) {
        throw new Error('Dashboard stats failed: ' + statsRes.body);
    }
    console.log('✅ 9. /api/dashboard/stats passed with accurate counts:', statsJson.stats);

    // 9. Test Excel Export /api/export/excel
    const excelRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/export/excel',
        method: 'GET',
        headers: {
            'Cookie': sessionCookie
        }
    });
    if (excelRes.statusCode !== 200 || !excelRes.headers['content-type'].includes('spreadsheetml')) {
        throw new Error('Excel export failed: ' + excelRes.statusCode);
    }
    console.log(`✅ 10. /api/export/excel passed (Downloaded ${excelRes.rawBody.length} bytes XLSX)`);

    // 10. Test PDF Export /api/export/pdf
    const pdfRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/export/pdf',
        method: 'GET',
        headers: {
            'Cookie': sessionCookie
        }
    });
    if (pdfRes.statusCode !== 200 || !pdfRes.headers['content-type'].includes('application/pdf')) {
        throw new Error('PDF export failed: ' + pdfRes.statusCode);
    }
    console.log(`✅ 11. /api/export/pdf passed (Streamed ${pdfRes.rawBody.length} bytes PDF)`);

    // 11. Test User Management /api/users
    const usersRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/users',
        method: 'GET',
        headers: {
            'Cookie': sessionCookie
        }
    });
    const usersJson = JSON.parse(usersRes.body);
    if (!usersJson.success || usersJson.count < 1) {
        throw new Error('List users failed: ' + usersRes.body);
    }
    console.log('✅ 12. /api/users passed, total users:', usersJson.count);

    // 12. Test Audit Logs /api/audit-logs
    const auditRes = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/audit-logs',
        method: 'GET',
        headers: {
            'Cookie': sessionCookie
        }
    });
    const auditJson = JSON.parse(auditRes.body);
    if (!auditJson.success || auditJson.total < 3) {
        throw new Error('Audit logs query failed: ' + auditRes.body);
    }
    console.log(`✅ 13. /api/audit-logs passed. Captured ${auditJson.total} audit events`);

    // Cleanup
    await Case.deleteMany({});
    await User.deleteMany({});
    await AuditLog.deleteMany({});
    await Counter.deleteMany({});
    console.log('🧹 Cleaned up test data');

    server.close();
    await mongoose.disconnect();
    console.log('🎉 ALL API AND INTEGRATION TESTS PASSED PERFECTLY!');
}

runApiTests().catch(err => {
    console.error('❌ API Test Suite Failed:', err);
    if (server) server.close();
    process.exit(1);
});
