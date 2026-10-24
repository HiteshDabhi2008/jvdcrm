const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Generate formatted Excel Workbook using ExcelJS
 */
async function generateExcelBuffer(cases) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Jivdaya Vatsalya Dham';
    workbook.lastModifiedBy = 'JVD CRM System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('JVD Animal Cases', {
        pageSetup: { orientation: 'landscape', paperSize: 9 }
    });

    // Define columns
    worksheet.columns = [
        { header: 'Reg. No.', key: 'reg_no', width: 16 },
        { header: 'Caller Name', key: 'caller_name', width: 22 },
        { header: 'Contact No.', key: 'contact_no', width: 15 },
        { header: 'Village / Area', key: 'village', width: 18 },
        { header: 'City / Taluka', key: 'city', width: 16 },
        { header: 'District', key: 'district', width: 15 },
        { header: 'State', key: 'state', width: 12 },
        { header: 'Animal Type', key: 'animal_type', width: 14 },
        { header: 'Species', key: 'species', width: 18 },
        { header: 'Sex', key: 'sex', width: 10 },
        { header: 'Clinical Status', key: 'status', width: 18 },
        { header: 'Incident Cause', key: 'cause', width: 28 },
        { header: 'Treatment Administered', key: 'treatment', width: 32 },
        { header: 'Contribution', key: 'contribution', width: 14 },
        { header: 'Registration Date', key: 'post_time', width: 20 },
        { header: 'Staff Incharge', key: 'last_edited_by', width: 20 }
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF163D2E' } // JVD Forest Green
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'medium', color: { argb: 'FF0D271D' } }
        };
    });

    // Add Data Rows
    cases.forEach((c, index) => {
        const row = worksheet.addRow({
            reg_no: c.reg_no || '',
            caller_name: c.caller_name || '',
            contact_no: c.contact_no || '',
            village: c.village || '',
            city: c.city || '',
            district: c.district || '',
            state: c.state || '',
            animal_type: c.animal_type || '',
            species: c.species || '',
            sex: c.sex || '',
            status: c.status || '',
            cause: c.cause || '',
            treatment: c.treatment || '',
            contribution: c.contribution || '–',
            post_time: c.post_time ? c.post_time.slice(0, 19).replace('T', ' ') : '',
            last_edited_by: c.last_edited_by || c.created_by || 'Staff'
        });

        // Alternating row background
        if (index % 2 === 1) {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF9FAF9' }
                };
            });
        }

        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.font = { name: 'Arial', size: 9 };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
        });
    });

    return await workbook.xlsx.writeBuffer();
}

/**
 * Generate formatted PDF Document using PDFKit and stream to response
 */
function streamPdfReport(cases, res, filterSummary = '') {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        bufferPages: true
    });

    // Pipe directly to HTTP response
    doc.pipe(res);

    // Header Banner
    doc.rect(0, 0, 842, 45).fill('#163D2E');
    doc.fillColor('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('JIVDAYA VATSALYA DHAM — VETERINARY CARE CASE RECORDS', 30, 12);
    
    doc.fontSize(8)
       .font('Helvetica')
       .text(`Official Clinical Report  |  Edufun Foundation Trust  |  Helpline: 97272-97187  |  Generated: ${new Date().toLocaleString('en-IN')}`, 30, 30);

    let y = 60;

    // Filter subtitle if applicable
    if (filterSummary) {
        doc.fillColor('#4B5563')
           .fontSize(8.5)
           .font('Helvetica-Oblique')
           .text(`Filter Applied: ${filterSummary} (${cases.length} records)`, 30, y);
        y += 18;
    } else {
        doc.fillColor('#4B5563')
           .fontSize(8.5)
           .font('Helvetica-Oblique')
           .text(`Total Records: ${cases.length}`, 30, y);
        y += 18;
    }

    // Column positions for A4 landscape (width ~842)
    const cols = [
        { header: 'Reg No', x: 30, w: 75 },
        { header: 'Caller', x: 108, w: 90 },
        { header: 'Contact', x: 202, w: 65 },
        { header: 'Animal', x: 270, w: 60 },
        { header: 'Species', x: 333, w: 75 },
        { header: 'Sex', x: 411, w: 45 },
        { header: 'Status', x: 459, w: 85 },
        { header: 'Cause / Incident', x: 547, w: 125 },
        { header: 'Date', x: 675, w: 65 },
        { header: 'Staff', x: 743, w: 70 }
    ];

    function drawTableHeader(curY) {
        doc.rect(30, curY, 782, 20).fill('#245C45');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        cols.forEach(c => {
            doc.text(c.header, c.x + 2, curY + 5, { width: c.w - 4, align: 'left' });
        });
        return curY + 22;
    }

    y = drawTableHeader(y);

    doc.font('Helvetica').fontSize(7.5);

    cases.forEach((c, idx) => {
        // Page break if near bottom
        if (y > 530) {
            doc.addPage();
            // Redraw top banner
            doc.rect(0, 0, 842, 35).fill('#163D2E');
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
               .text('JIVDAYA VATSALYA DHAM — CASE RECORDS (Continued)', 30, 12);
            y = drawTableHeader(50);
            doc.font('Helvetica').fontSize(7.5);
        }

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAF9';
        doc.rect(30, y, 782, 17).fill(rowBg);

        doc.fillColor('#1F2937');
        const regStr = c.reg_no || '';
        const callerStr = c.caller_name || '';
        const contactStr = c.contact_no || '';
        const typeStr = c.animal_type || '';
        const speciesStr = c.species || '';
        const sexStr = c.sex || '';
        const statusStr = c.status || '';
        const causeStr = (c.cause || '').slice(0, 30);
        const dateStr = c.post_time ? c.post_time.slice(0, 10) : '';
        const staffStr = (c.last_edited_by || c.created_by || 'Staff').slice(0, 15);

        doc.text(regStr, cols[0].x + 2, y + 4, { width: cols[0].w - 4, lineBreak: false });
        doc.text(callerStr, cols[1].x + 2, y + 4, { width: cols[1].w - 4, lineBreak: false });
        doc.text(contactStr, cols[2].x + 2, y + 4, { width: cols[2].w - 4, lineBreak: false });
        doc.text(typeStr, cols[3].x + 2, y + 4, { width: cols[3].w - 4, lineBreak: false });
        doc.text(speciesStr, cols[4].x + 2, y + 4, { width: cols[4].w - 4, lineBreak: false });
        doc.text(sexStr, cols[5].x + 2, y + 4, { width: cols[5].w - 4, lineBreak: false });
        doc.text(statusStr, cols[6].x + 2, y + 4, { width: cols[6].w - 4, lineBreak: false });
        doc.text(causeStr, cols[7].x + 2, y + 4, { width: cols[7].w - 4, lineBreak: false });
        doc.text(dateStr, cols[8].x + 2, y + 4, { width: cols[8].w - 4, lineBreak: false });
        doc.text(staffStr, cols[9].x + 2, y + 4, { width: cols[9].w - 4, lineBreak: false });

        y += 18;
    });

    // Page numbering on all pages
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#9CA3AF').fontSize(7.5)
           .text(`Page ${i + 1} of ${pageRange.count}  •  Jivdaya Vatsalya Dham  •  NH-168, Dhanera Khimat Highway, Samarvada, Gujarat`, 30, 565, {
               align: 'center',
               width: 782
           });
    }

    doc.end();
}

module.exports = {
    generateExcelBuffer,
    streamPdfReport
};
