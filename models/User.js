const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String }, // Optional
    role: { type: String, required: true, enum: ['employee', 'head'] },
    password: { type: String }, // Optional for Google OAuth users
    googleId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
