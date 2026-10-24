const Case = require('../models/Case');

/**
 * Returns comprehensive, real-time database metrics for the Dashboard.
 */
async function getDashboardStatsApi(req, res) {
    try {
        // Run aggregation across active (non-archived) cases
        const matchActive = { is_archived: false };

        const [
            statusAggregation,
            typeAggregation,
            totalActiveCases,
            totalArchivedCases,
            recentCases
        ] = await Promise.all([
            // Status breakdown
            Case.aggregate([
                { $match: matchActive },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            // Animal classification breakdown (Domestic vs Wild)
            Case.aggregate([
                { $match: matchActive },
                { $group: { _id: '$animal_type', count: { $sum: 1 } } }
            ]),
            Case.countDocuments(matchActive),
            Case.countDocuments({ is_archived: true }),
            Case.find(matchActive)
                .sort({ post_time: -1, _id: -1 })
                .limit(8)
                .select('reg_no caller_name contact_no animal_type species status post_time')
                .lean()
        ]);

        // Map status counts
        const stats = {
            total: totalActiveCases,
            archived: totalArchivedCases,
            under_treatment: 0,
            site_treatment: 0,
            jvd_treatment: 0,
            released: 0,
            death: 0,
            run_away: 0,
            domestic: 0,
            wild: 0
        };

        statusAggregation.forEach(item => {
            const st = (item._id || '').trim();
            if (st === 'Under Treatment') stats.under_treatment = item.count;
            else if (st === 'Site Treatment') stats.site_treatment = item.count;
            else if (st === 'JVD Treatment') stats.jvd_treatment = item.count;
            else if (st === 'Release') stats.released = item.count;
            else if (st === 'Death') stats.death = item.count;
            else if (st === 'Run Away') stats.run_away = item.count;
        });

        // Combined overall active treatment (Under + Site + JVD)
        stats.total_in_treatment = stats.under_treatment + stats.site_treatment + stats.jvd_treatment;

        typeAggregation.forEach(item => {
            const t = (item._id || '').trim();
            if (t === 'Domestic') stats.domestic = item.count;
            else if (t === 'Wild') stats.wild = item.count;
        });

        res.json({
            success: true,
            stats,
            recentCases
        });
    } catch (err) {
        console.error('[Dashboard Stats Error]:', err);
        res.status(500).json({ success: false, error: 'Failed to calculate dashboard statistics: ' + err.message });
    }
}

module.exports = {
    getDashboardStatsApi
};
