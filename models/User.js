const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    full_name: { 
        type: String, 
        required: [true, 'Full name is required'],
        trim: true 
    },
    username: { 
        type: String, 
        required: [true, 'Username is required'], 
        unique: true,
        trim: true,
        lowercase: true,
        index: true 
    },
    email: { 
        type: String, 
        trim: true,
        lowercase: true,
        index: true 
    },
    role: { 
        type: String, 
        required: true, 
        enum: ['employee', 'head'], 
        default: 'employee' 
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'blocked', 'pending'],
        default: 'active',
        index: true
    },
    password: { 
        type: String 
    },
    googleId: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    avatar: {
        type: String
    },
    last_login: {
        type: Date
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);
