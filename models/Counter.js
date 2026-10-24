const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

/**
 * Concurrency-safe atomic registration number generator.
 * Format: JVD-YYYY-0001 (also recognizes legacy JVD.YYYY.0001 for sequence continuity).
 */
async function getNextRegNo(year = new Date().getFullYear()) {
    const counterId = `case_reg_no_${year}`;
    
    // Check if counter document already initialized
    let counter = await Counter.findById(counterId);
    if (!counter) {
        // Initialize counter by scanning existing cases for highest sequence in this year
        const Case = mongoose.model('Case');
        const pattern = new RegExp(`^JVD[-.]${year}[-.](\\d+)`, 'i');
        const cases = await Case.find({ 
            reg_no: { $regex: new RegExp(`^JVD[-.]${year}[-.]`, 'i') } 
        }).select('reg_no').lean();

        let maxNum = 0;
        for (const c of cases) {
            const match = String(c.reg_no).match(pattern);
            if (match && match[1]) {
                const n = parseInt(match[1], 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
            }
        }

        // Upsert counter initialized to maxNum
        await Counter.findByIdAndUpdate(
            counterId,
            { $setOnInsert: { seq: maxNum } },
            { upsert: true, returnDocument: 'after' }
        );
    }

    // Atomically increment and get new sequence
    const updatedCounter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
    );

    const paddedNum = String(updatedCounter.seq).padStart(4, '0');
    return `JVD-${year}-${paddedNum}`;
}

module.exports = {
    Counter,
    getNextRegNo
};
