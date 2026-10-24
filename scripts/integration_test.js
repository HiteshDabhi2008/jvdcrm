const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Case = require('../models/Case');

async function runTests() {
  console.log('--- Starting Comprehensive Integration Test Suite ---');

  // 1. Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jvd_crm';
  await mongoose.connect(mongoUri);
  console.log('✅ 1. MongoDB Connected successfully');

  // 2. Test User Model & Registration
  const testUsername = 'test_staff_' + Date.now();
  const testPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  const testUser = new User({
    full_name: 'Test Staff Member',
    username: testUsername,
    email: `${testUsername}@edufunfoundation.in`,
    role: 'employee',
    password: hashedPassword
  });
  await testUser.save();
  console.log(`✅ 2. User registration saved successfully: ${testUsername}`);

  // Test Password Verification
  const fetchedUser = await User.findOne({ username: testUsername });
  const isMatch = await bcrypt.compare(testPassword, fetchedUser.password);
  if (!isMatch) throw new Error('Password verification failed');
  console.log('✅ 3. Password hashing and verification passed');

  // 3. Test Case Creation & Reg No generation
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
  const generatedRegNo = `${prefix}${nextNum.toString().padStart(4, '0')}`;

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const newCase = new Case({
    reg_no: generatedRegNo,
    caller_name: 'Pravin Patel',
    contact_no: '9825012345',
    village: 'Samarvada',
    city: 'Dhanera',
    district: 'Banaskantha',
    state: 'Gujarat',
    animal_type: 'Domestic',
    species: 'Cow',
    sex: 'Female',
    cause: 'Deep leg wound due to wire fence',
    discrimination: 'Cow was found near farm border, unable to walk properly',
    treatment: 'Dressing done, antiseptic spray applied, painkiller injection given',
    contribution: '500 INR received from caller',
    status: 'Under Treatment',
    post_time: nowStr,
    last_edited_by: fetchedUser.full_name,
    last_edited_at: nowStr
  });
  await newCase.save();
  console.log(`✅ 4. Case created with Reg No: ${generatedRegNo}`);

  // 4. Test Case Lookup (Case-insensitive)
  const lookupLower = generatedRegNo.toLowerCase();
  const safeRegex = new RegExp(`^${lookupLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const foundCase = await Case.findOne({ reg_no: safeRegex }).lean();
  if (!foundCase || foundCase.reg_no !== generatedRegNo) {
    throw new Error(`Case lookup failed for ${lookupLower}`);
  }
  console.log(`✅ 5. Case lookup case-insensitively passed for "${lookupLower}" -> found "${foundCase.reg_no}"`);

  // 5. Test Case Update
  const updateTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const updatedCase = await Case.findOneAndUpdate(
    { reg_no: safeRegex },
    {
      status: 'Release',
      treatment: 'Wound healed completely. Released back to sanctuary.',
      last_edited_by: 'Head Doctor',
      last_edited_at: updateTime
    },
    { returnDocument: 'after' }
  );
  if (!updatedCase || updatedCase.status !== 'Release') {
    throw new Error('Case update failed');
  }
  console.log(`✅ 6. Case updated successfully: Status changed to "${updatedCase.status}"`);

  // 6. Test Case Filtering / Querying
  const filteredCases = await Case.find({
    status: 'Release',
    animal_type: 'Domestic'
  }).lean();
  if (!filteredCases.some(c => c.reg_no === generatedRegNo)) {
    throw new Error('Filter query did not return the expected case');
  }
  console.log(`✅ 7. Filtering by status and animal type passed (${filteredCases.length} records matched)`);

  // Clean up test records
  await User.deleteOne({ _id: testUser._id });
  await Case.deleteOne({ _id: newCase._id });
  console.log('✅ 8. Test cleanup completed');

  await mongoose.disconnect();
  console.log('--- ALL INTEGRATION TESTS PASSED PERFECTLY ---');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
