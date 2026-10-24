const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
    reg_no: { type: String, required: true, unique: true },
    caller_name: { type: String, required: true },
    contact_no: { type: String, required: true },
    village: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, default: "Gujarat" },
    animal_type: { type: String, required: true },
    species: { type: String, required: true },
    sex: { type: String, required: true },
    cause: { type: String, required: true },
    discrimination: { type: String }, // Optional notes
    treatment: { type: String, required: true },
    contribution: { type: String },
    status: { type: String, required: true },
    post_time: { type: String }, // ISO string format for consistency with Python original
    last_edited_by: { type: String },
    last_edited_at: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Case', CaseSchema);
