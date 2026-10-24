require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Case = require('../models/Case');
const { Counter, getNextRegNo } = require('../models/Counter');
const AuditLog = require('../models/AuditLog');

async function testModels() {
    console.log('🧪 Starting Phase 2 Model & Concurrency Verification...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jvd_crm';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Test Atomic Reg No Concurrency
    console.log('Testing concurrent Reg No generation (10 simultaneous calls)...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(getNextRegNo());
    }
    const generated = await Promise.all(promises);
    console.log('Generated numbers:', generated);

    // Verify all 10 are unique
    const uniqueSet = new Set(generated);
    if (uniqueSet.size !== 10) {
        throw new Error(`Concurrency failure! Duplicates detected in: ${generated.join(', ')}`);
    }
    console.log('✅ Concurrency test PASSED: All 10 registration numbers are strictly unique.');

    // 2. Test User Model validation
    const testUser = new User({
        full_name: 'Dr. Ramesh Sharma',
        username: 'dr_ramesh_' + Date.now(),
        email: 'ramesh@edufunfoundation.in',
        role: 'employee',
        status: 'active'
    });
    await testUser.save();
    console.log('✅ User model passed with status "active" and role "employee":', testUser.username);

    // 3. Test Case Model
    const testCase = new Case({
        reg_no: generated[0],
        caller_name: 'Hitesh Patel',
        contact_no: '9876543210',
        village: 'Samarvada',
        city: 'Dhanera',
        district: 'Banaskantha',
        state: 'Gujarat',
        animal_type: 'Domestic',
        species: 'Cow',
        sex: 'Female',
        cause: 'Road accident near bridge',
        treatment: 'Suturing done, antiseptic spray, anti-inflammatory injection',
        status: 'Under Treatment',
        post_time: new Date().toISOString(),
        created_by: testUser.full_name
    });
    await testCase.save();
    console.log('✅ Case model created successfully with Reg No:', testCase.reg_no);

    // 4. Test AuditLog Model
    const testAudit = new AuditLog({
        user_id: testUser._id,
        user_name: testUser.full_name,
        user_role: testUser.role,
        action: 'CASE_CREATE',
        target_type: 'CASE',
        target_id: testCase.reg_no,
        details: { species: 'Cow', cause: testCase.cause },
        ip_address: '127.0.0.1'
    });
    await testAudit.save();
    console.log('✅ AuditLog record created successfully for action:', testAudit.action);

    // Cleanup test artifacts
    await Case.deleteOne({ _id: testCase._id });
    await User.deleteOne({ _id: testUser._id });
    await AuditLog.deleteOne({ _id: testAudit._id });
    // Clean up counter for test isolation
    await Counter.deleteMany({});
    console.log('🧹 Cleaned up test data');

    await mongoose.disconnect();
    console.log('🎉 ALL PHASE 2 MODEL TESTS PASSED!');
}

testModels().catch(err => {
    console.error('❌ Phase 2 Test Failed:', err);
    process.exit(1);
});
