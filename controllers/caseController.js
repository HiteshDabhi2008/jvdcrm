const Case = require('../models/Case');
const { getNextRegNo } = require('../models/Counter');
const { recordAudit } = require('../services/auditService');
const { sanitizeString } = require('../middleware/security');

// Create New Case
async function createCase(req, res, next) {
    try {
        const {
            caller_name,
            contact_no,
            village,
            city,
            district,
            state,
            animal_type,
            species,
            sex,
            cause,
            discrimination,
            treatment,
            contribution,
            status
        } = req.body;

        // Validation
        if (!caller_name || !contact_no || !village || !city || !animal_type || !species || !cause || !treatment) {
            req.flash('error', '⚠️ Please complete all required fields.');
            return res.redirect('/entry');
        }

        const cleanContact = String(contact_no).replace(/[^0-9]/g, '');
        if (cleanContact.length !== 10) {
            req.flash('error', '⚠️ Please provide a valid 10-digit mobile number.');
            return res.redirect('/entry');
        }

        // Generate race-condition-free Reg No
        const newRegNo = await getNextRegNo();
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const staffName = req.user ? (req.user.full_name || req.user.username) : 'Staff';

        const newCase = new Case({
            reg_no: newRegNo,
            caller_name: caller_name.trim(),
            contact_no: cleanContact,
            village: village.trim(),
            city: city.trim(),
            district: (district || 'Banaskantha').trim(),
            state: (state || 'Gujarat').trim(),
            animal_type: animal_type.trim(),
            species: species.trim(),
            sex: sex || 'Unknown',
            cause: cause.trim(),
            discrimination: discrimination ? discrimination.trim() : '',
            treatment: treatment.trim(),
            contribution: contribution ? contribution.trim() : '',
            status: status || 'Under Treatment',
            post_time: nowStr,
            created_by: staffName,
            last_edited_by: staffName,
            last_edited_at: nowStr
        });

        await newCase.save();

        // Audit Log
        await recordAudit({
            req,
            action: 'CASE_CREATE',
            targetType: 'CASE',
            targetId: newRegNo,
            details: {
                animal_type: newCase.animal_type,
                species: newCase.species,
                status: newCase.status,
                caller: newCase.caller_name
            }
        });

        req.flash('success', `✅ Case ${newRegNo} registered successfully!`);
        res.redirect(`/success/${newRegNo}`);
    } catch (err) {
        next(err);
    }
}

// Update Existing Case
async function updateCase(req, res, next) {
    try {
        const rawRegNo = (req.body.reg_no || '').trim();
        if (!rawRegNo) {
            req.flash('error', '⚠️ Missing Registration Number for update.');
            return res.redirect('/entry');
        }

        const safePattern = new RegExp(`^${rawRegNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const existing = await Case.findOne({ reg_no: safePattern });
        if (!existing) {
            req.flash('error', `⚠️ Case "${rawRegNo}" not found in database.`);
            return res.redirect('/entry');
        }

        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const staffName = req.user ? (req.user.full_name || req.user.username) : 'Staff';

        const {
            caller_name,
            contact_no,
            village,
            city,
            district,
            state,
            animal_type,
            species,
            sex,
            cause,
            discrimination,
            treatment,
            contribution,
            status
        } = req.body;

        if (caller_name) existing.caller_name = caller_name.trim();
        if (contact_no) existing.contact_no = String(contact_no).replace(/[^0-9]/g, '');
        if (village) existing.village = village.trim();
        if (city) existing.city = city.trim();
        if (district) existing.district = district.trim();
        if (state) existing.state = state.trim();
        if (animal_type) existing.animal_type = animal_type.trim();
        if (species) existing.species = species.trim();
        if (sex) existing.sex = sex.trim();
        if (cause) existing.cause = cause.trim();
        if (discrimination !== undefined) existing.discrimination = discrimination.trim();
        if (treatment) existing.treatment = treatment.trim();
        if (contribution !== undefined) existing.contribution = contribution.trim();
        
        const oldStatus = existing.status;
        if (status) existing.status = status.trim();

        existing.last_edited_by = staffName;
        existing.last_edited_at = nowStr;

        await existing.save();

        // Audit Log
        await recordAudit({
            req,
            action: oldStatus !== existing.status ? 'CASE_STATUS_CHANGE' : 'CASE_UPDATE',
            targetType: 'CASE',
            targetId: existing.reg_no,
            details: {
                oldStatus,
                newStatus: existing.status,
                treatment: existing.treatment
            }
        });

        req.flash('success', `✅ Case ${existing.reg_no} updated successfully!`);
        res.redirect(`/success/${existing.reg_no}`);
    } catch (err) {
        next(err);
    }
}

// Case Lookup (AJAX)
async function lookupCase(req, res) {
    try {
        const rawReg = (req.query.reg_no || '').trim();
        if (!rawReg) return res.json({ found: false, message: 'Please enter a registration number' });

        const safePattern = new RegExp(`^${rawReg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const c = await Case.findOne({ reg_no: safePattern }).lean();

        if (c) {
            res.json({ found: true, case: c });
        } else {
            res.json({ found: false, message: `No case found matching "${rawReg}"` });
        }
    } catch (err) {
        res.status(500).json({ found: false, error: 'Database search error' });
    }
}

// Full Query & Filter API with Server-Side Pagination
async function getCasesApi(req, res) {
    try {
        const {
            q,
            contact_no,
            animal_type,
            species,
            status,
            from_date,
            to_date,
            page = 1,
            limit = 25,
            archived = 'false',
            sort_by = 'post_time',
            order = 'desc'
        } = req.query;

        const filter = {
            is_archived: archived === 'true'
        };

        // Universal keyword search (reg_no, caller_name, contact_no, species, cause)
        if (q && q.trim()) {
            const kw = sanitizeString(q.trim());
            const kwRegex = new RegExp(kw, 'i');
            filter.$or = [
                { reg_no: kwRegex },
                { caller_name: kwRegex },
                { contact_no: kwRegex },
                { species: kwRegex },
                { cause: kwRegex }
            ];
        }

        if (contact_no && contact_no.trim()) {
            filter.contact_no = new RegExp(sanitizeString(contact_no.trim()), 'i');
        }
        if (animal_type && animal_type.trim()) {
            filter.animal_type = animal_type.trim();
        }
        if (species && species.trim()) {
            filter.species = new RegExp(`^${sanitizeString(species.trim())}$`, 'i');
        }
        if (status && status.trim()) {
            filter.status = status.trim();
        }

        // Date range filtering
        if (from_date || to_date) {
            filter.post_time = {};
            if (from_date) {
                filter.post_time.$gte = from_date.trim();
            }
            if (to_date) {
                // Include entire to_date day
                const nextDay = new Date(new Date(to_date.trim()).getTime() + 86400000).toISOString().slice(0, 10);
                filter.post_time.$lt = nextDay;
            }
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 25));
        const skip = (pageNum - 1) * limitNum;

        const sortOrder = order === 'asc' ? 1 : -1;
        const sortObj = {};
        sortObj[sort_by] = sortOrder;
        if (sort_by !== '_id') sortObj._id = -1;

        const [total, cases] = await Promise.all([
            Case.countDocuments(filter),
            Case.find(filter)
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);

        res.json({
            success: true,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
            cases
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to retrieve cases: ' + err.message });
    }
}

// Single Case Details API
async function getCaseDetailsApi(req, res) {
    try {
        const rawReg = (req.params.reg_no || '').trim();
        const safePattern = new RegExp(`^${rawReg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const c = await Case.findOne({ reg_no: safePattern }).lean();

        if (!c) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        res.json({ success: true, case: c });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Quick Status Update API
async function updateStatusApi(req, res) {
    try {
        const rawReg = (req.params.reg_no || '').trim();
        const { status } = req.body;

        const validStatuses = [
            'Under Treatment',
            'Site Treatment',
            'JVD Treatment',
            'Release',
            'Death',
            'Run Away'
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status provided' });
        }

        const safePattern = new RegExp(`^${rawReg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const staffName = req.user ? (req.user.full_name || req.user.username) : 'Staff';
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

        const updated = await Case.findOneAndUpdate(
            { reg_no: safePattern },
            {
                status,
                last_edited_by: staffName,
                last_edited_at: nowStr
            },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        // Record Audit
        await recordAudit({
            req,
            action: 'CASE_STATUS_CHANGE',
            targetType: 'CASE',
            targetId: updated.reg_no,
            details: { newStatus: status }
        });

        res.json({ success: true, case: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Archive / Restore Case API (HEAD only)
async function toggleArchiveApi(req, res) {
    try {
        const rawReg = (req.params.reg_no || '').trim();
        const safePattern = new RegExp(`^${rawReg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const c = await Case.findOne({ reg_no: safePattern });

        if (!c) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        c.is_archived = !c.is_archived;
        c.last_edited_by = req.user.full_name || req.user.username;
        c.last_edited_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await c.save();

        await recordAudit({
            req,
            action: c.is_archived ? 'CASE_ARCHIVE' : 'CASE_RESTORE',
            targetType: 'CASE',
            targetId: c.reg_no,
            details: { is_archived: c.is_archived }
        });

        res.json({
            success: true,
            is_archived: c.is_archived,
            message: `Case ${c.reg_no} has been ${c.is_archived ? 'archived' : 'restored'}.`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = {
    createCase,
    updateCase,
    lookupCase,
    getCasesApi,
    getCaseDetailsApi,
    updateStatusApi,
    toggleArchiveApi
};
