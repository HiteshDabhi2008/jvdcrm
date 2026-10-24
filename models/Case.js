const mongoose = require('mongoose');

const STATUS_OPTIONS = [
    "Under Treatment",
    "Site Treatment",
    "JVD Treatment",
    "Release",
    "Death",
    "Run Away"
];

const CaseSchema = new mongoose.Schema({
    reg_no: { 
        type: String, 
        required: [true, 'Registration number is required'], 
        unique: true,
        trim: true,
        uppercase: true,
        index: true 
    },
    caller_name: { 
        type: String, 
        required: [true, 'Caller name is required'],
        trim: true,
        index: true
    },
    contact_no: { 
        type: String, 
        required: [true, 'Contact number is required'],
        trim: true,
        index: true
    },
    village: { 
        type: String, 
        required: [true, 'Village/Area is required'],
        trim: true 
    },
    city: { 
        type: String, 
        required: [true, 'City/Taluka is required'],
        trim: true 
    },
    district: { 
        type: String, 
        required: [true, 'District is required'],
        default: 'Banaskantha',
        trim: true 
    },
    state: { 
        type: String, 
        default: 'Gujarat',
        trim: true 
    },
    animal_type: { 
        type: String, 
        required: [true, 'Animal type is required'],
        enum: ['Domestic', 'Wild'],
        index: true 
    },
    species: { 
        type: String, 
        required: [true, 'Species is required'],
        trim: true,
        index: true 
    },
    sex: { 
        type: String, 
        required: [true, 'Sex is required'],
        enum: ['Male', 'Female', 'Unknown'],
        default: 'Unknown' 
    },
    cause: { 
        type: String, 
        required: [true, 'Cause of injury/illness is required'],
        trim: true 
    },
    discrimination: { 
        type: String, 
        trim: true 
    },
    treatment: { 
        type: String, 
        required: [true, 'Treatment administered is required'],
        trim: true 
    },
    contribution: { 
        type: String, 
        trim: true 
    },
    status: { 
        type: String, 
        required: [true, 'Case status is required'],
        enum: STATUS_OPTIONS,
        default: 'Under Treatment',
        index: true 
    },
    post_time: { 
        type: String,
        index: true 
    },
    created_by: { 
        type: String,
        trim: true 
    },
    last_edited_by: { 
        type: String,
        trim: true 
    },
    last_edited_at: { 
        type: String 
    },
    is_archived: { 
        type: Boolean, 
        default: false,
        index: true 
    }
}, { 
    timestamps: true 
});

// Compound indexes for high-speed multi-parameter search & filtering
CaseSchema.index({ animal_type: 1, species: 1, status: 1 });
CaseSchema.index({ is_archived: 1, post_time: -1 });

module.exports = mongoose.model('Case', CaseSchema);
module.exports.STATUS_OPTIONS = STATUS_OPTIONS;
