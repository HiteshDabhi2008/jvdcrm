const Case = require('../models/Case');
const { generateExcelBuffer, streamPdfReport } = require('../services/exportService');
const { recordAudit } = require('../services/auditService');
const { sanitizeString } = require('../middleware/security');

// Helper to construct filter object from request query
function buildFilterFromQuery(query) {
    const filter = { is_archived: false };
    const { q, contact_no, animal_type, species, status, from_date, to_date } = query;

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

    if (from_date || to_date) {
        filter.post_time = {};
        if (from_date) filter.post_time.$gte = from_date.trim();
        if (to_date) {
            const nextDay = new Date(new Date(to_date.trim()).getTime() + 86400000).toISOString().slice(0, 10);
            filter.post_time.$lt = nextDay;
        }
    }

    return filter;
}

// Export Filtered Cases to Excel (.xlsx)
async function exportExcel(req, res, next) {
    try {
        const filter = buildFilterFromQuery(req.query);
        const cases = await Case.find(filter).sort({ post_time: -1, _id: -1 }).lean();

        if (!cases || cases.length === 0) {
            req.flash('error', '⚠️ No matching records found to export.');
            return res.redirect('/view');
        }

        const buffer = await generateExcelBuffer(cases);
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `JVD_Cases_Export_${dateStr}.xlsx`;

        // Record Audit
        await recordAudit({
            req,
            action: 'EXPORT_EXCEL',
            targetType: 'EXPORT',
            targetId: filename,
            details: { recordCount: cases.length, filter: req.query }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (err) {
        next(err);
    }
}

// Export Filtered Cases to PDF (.pdf)
async function exportPdf(req, res, next) {
    try {
        const filter = buildFilterFromQuery(req.query);
        const cases = await Case.find(filter).sort({ post_time: -1, _id: -1 }).lean();

        if (!cases || cases.length === 0) {
            req.flash('error', '⚠️ No matching records found to export.');
            return res.redirect('/view');
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `JVD_Case_Report_${dateStr}.pdf`;

        // Construct human-readable filter summary for PDF banner
        const parts = [];
        if (req.query.status) parts.push(`Status: ${req.query.status}`);
        if (req.query.animal_type) parts.push(`Type: ${req.query.animal_type}`);
        if (req.query.species) parts.push(`Species: ${req.query.species}`);
        if (req.query.from_date || req.query.to_date) parts.push(`Date: ${req.query.from_date || 'Start'} to ${req.query.to_date || 'Today'}`);
        const filterSummary = parts.length > 0 ? parts.join(' | ') : 'All Active Cases';

        // Record Audit
        await recordAudit({
            req,
            action: 'EXPORT_PDF',
            targetType: 'EXPORT',
            targetId: filename,
            details: { recordCount: cases.length, filter: req.query }
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        streamPdfReport(cases, res, filterSummary);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    exportExcel,
    exportPdf
};
