const PDFDocument = require('pdfkit');

/**
 * Generates an AgriNex Settlement & Payout Statement PDF as a Buffer.
 * Includes complete financial calculation breakdown and AgriNex promotional section.
 */
const generateSettlementPdfBuffer = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `AgriNex Settlement - ${data.statementId}`,
          Author: 'AgriNex Vertical Farming',
          Subject: 'Harvest Settlement Statement'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#15803d'; // Emerald green
      const darkColor = '#0f172a';    // Slate 900
      const grayColor = '#475569';    // Slate 600
      const lightBg = '#f8fafc';      // Slate 50
      const accentGold = '#c49e40';   // Gold

      // ── HEADER SECTION ────────────────────────────────────────────────────────
      doc.rect(40, 40, 515, 60).fillAndStroke(primaryColor, primaryColor);
      
      doc.fillColor('#ffffff')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('AGRINEX VERTICAL FARMING', 55, 52, { letterSpacing: 1 });
      
      doc.fontSize(9)
         .font('Helvetica')
         .text('SMART AIoT VERTICAL AGRICULTURE & AUTOMATION', 55, 76, { letterSpacing: 0.5 });

      doc.fillColor('#ffffff')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('SETTLEMENT STATEMENT', 360, 62, { align: 'right', width: 180 });

      // ── STATEMENT SUMMARY BOX ────────────────────────────────────────────────
      let y = 115;
      doc.rect(40, y, 515, 80).fillAndStroke(lightBg, '#e2e8f0');

      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold');
      doc.text('STATEMENT ID', 55, y + 12);
      doc.text('STATEMENT DATE', 190, y + 12);
      doc.text('FARMER / LANDOWNER', 320, y + 12);

      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold');
      doc.text(data.statementId || 'N/A', 55, y + 24);
      doc.font('Helvetica').text(new Date(data.statementDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 190, y + 24);
      doc.font('Helvetica-Bold').text(data.userName || 'Valued Farmer', 320, y + 24, { width: 220, ellipsis: true });

      doc.fillColor(grayColor).fontSize(8).font('Helvetica-Bold');
      doc.text('PLOT NUMBER', 55, y + 46);
      doc.text('CROP TYPE', 190, y + 46);
      doc.text('DISBURSEMENT STATUS', 320, y + 46);

      doc.fillColor(darkColor).fontSize(10).font('Helvetica');
      doc.text(`Plot #${data.plotNumber || 'N/A'}`, 55, y + 58);
      doc.text(data.cropType || 'Crop', 190, y + 58);
      doc.fillColor(primaryColor).font('Helvetica-Bold').text('PAID / SETTLED', 320, y + 58);

      // ── FINANCIAL BREAKDOWN TABLE ─────────────────────────────────────────────
      y = 210;
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold');
      doc.text('HARVEST REVENUE & PAYOUT BREAKDOWN', 40, y);

      y += 18;
      // Table Header
      doc.rect(40, y, 515, 22).fillAndStroke('#e2e8f0', '#cbd5e1');
      doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold');
      doc.text('Item Description', 50, y + 6);
      doc.text('Details / Rate', 320, y + 6);
      doc.text('Amount (INR)', 440, y + 6, { width: 105, align: 'right' });

      y += 22;
      const rows = [
        { desc: 'Total Crop Harvested', detail: `${Number(data.yieldKg || 0).toLocaleString('en-IN')} kg`, amount: '' },
        { desc: 'Average Market Selling Rate', detail: `₹${Number(data.marketRate || 0).toFixed(2)} / kg`, amount: '' },
        { desc: 'Gross Harvest Revenue', detail: 'Yield × Market Rate', amount: `₹${Number(data.grossRevenue || 0).toFixed(2)}`, bold: true, bg: '#f1f5f9' },
        { desc: 'Monthly Farm Maintenance & Service Fee', detail: 'Power, Water & IoT Infrastructure', amount: `- ₹${Number(data.monthlyServiceFee || 0).toFixed(2)}`, textRed: true },
        { desc: 'Adjusted Profit Pool', detail: 'Gross Revenue - Maintenance Fee', amount: `₹${Number(data.adjustedPool || 0).toFixed(2)}`, bold: true, bg: '#f8fafc' },
        { desc: 'Next Cycle Soil & Input Reserve (10%)', detail: 'Reserved for seeds & organic nutrition', amount: `- ₹${Number(data.soilReserve || 0).toFixed(2)}`, textRed: true },
        { desc: 'AgriNex Platform Operations Margin (10%)', detail: 'Monitoring, agronomist supervision & cloud services', amount: `- ₹${Number(data.platformMargin || 0).toFixed(2)}`, textRed: true },
      ];

      rows.forEach((r) => {
        if (r.bg) {
          doc.rect(40, y, 515, 20).fillAndStroke(r.bg, '#e2e8f0');
        } else {
          doc.rect(40, y, 515, 20).stroke('#e2e8f0');
        }

        doc.fillColor(darkColor).fontSize(9).font(r.bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(r.desc, 50, y + 5, { width: 260 });

        doc.fillColor(grayColor).fontSize(8).font('Helvetica');
        doc.text(r.detail, 320, y + 5);

        if (r.amount) {
          doc.fillColor(r.textRed ? '#dc2626' : (r.bold ? darkColor : grayColor))
             .fontSize(9)
             .font(r.bold ? 'Helvetica-Bold' : 'Helvetica')
             .text(r.amount, 440, y + 5, { width: 105, align: 'right' });
        }

        y += 20;
      });

      // ── NET PAYOUT HIGHLIGHT BOX ─────────────────────────────────────────────
      y += 6;
      doc.rect(40, y, 515, 42).fillAndStroke('#ecfdf5', primaryColor);
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold');
      doc.text('TOTAL NET PAYOUT PAYABLE (80%):', 55, y + 14);

      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold');
      doc.text(`₹${Number(data.netPayout || 0).toFixed(2)}`, 350, y + 12, { width: 195, align: 'right' });

      // ── PROMOTION SECTION: GROW WITH AGRINEX ──────────────────────────────────
      y += 56;
      doc.rect(40, y, 515, 95).fillAndStroke('#f0fdf4', '#86efac');

      // Tag
      doc.rect(50, y + 10, 140, 16).fillAndStroke(primaryColor, primaryColor);
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text('GROW WITH AGRINEX', 55, y + 14, { width: 130, align: 'center' });

      doc.fillColor('#14532d').fontSize(11).font('Helvetica-Bold')
         .text('Expand Your Precision Farming Portfolio & Maximize Returns', 200, y + 12);

      doc.fillColor('#166534').fontSize(8.5).font('Helvetica')
         .text('• Re-invest your payout into next-cycle Aeroponics & Hydroponics zones to earn up to 25% higher seasonal yields.\n• Refer fellow landowners and agriculture investors to AgriNex and receive up to 5% bonus dividend on every harvest cycle.\n• Access real-time IoT climate telemetry, nutrient dosing reports, and farm cameras 24/7 on your mobile app.', 55, y + 36, {
           lineGap: 3,
           width: 485
         });

      // ── FOOTER & DISCLAIMER ──────────────────────────────────────────────────
      y += 110;
      doc.rect(40, y, 515, 1).fill('#cbd5e1');
      y += 8;
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
         .text('This is an official computer-generated statement issued by AgriNex Vertical Farming Pvt. Ltd.', 40, y, { align: 'center', width: 515 });
      doc.text('Inquiries & Investor Support: support@agrinex.com | https://agrinex.vercel.app/ | +91 800 AGRINEX', 40, y + 12, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateSettlementPdfBuffer };
