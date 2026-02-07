const express = require('express');
const PDFDocument = require('pdfkit');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

router.get('/export', authenticate, authorize(['it_manager', 'system_admin']), async (req, res, next) => {
  try {
    const {
      format = 'csv',
      start_date,
      end_date,
      action_type,
      user_id,
      ticket_id,
    } = req.query;

    const db = req.app.get('db');
    const filters = [];
    const values = [];

    if (start_date) {
      values.push(start_date);
      filters.push(`a.timestamp >= $${values.length}`);
    }
    if (end_date) {
      values.push(end_date);
      filters.push(`a.timestamp <= $${values.length}`);
    }
    if (action_type) {
      values.push(action_type);
      filters.push(`a.action_type = $${values.length}`);
    }
    if (user_id) {
      values.push(user_id);
      filters.push(`a.user_id = $${values.length}`);
    }
    if (ticket_id) {
      values.push(ticket_id);
      filters.push(`a.ticket_id = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT a.log_id, a.ticket_id, t.ticket_number, a.user_id, u.full_name,
              a.action_type, a.entity_type, a.entity_id, a.description,
              a.ip_address, a.user_agent, a.timestamp
       FROM audit_logs a
       LEFT JOIN tickets t ON t.ticket_id = a.ticket_id
       LEFT JOIN users u ON u.user_id = a.user_id
       ${whereClause}
       ORDER BY a.timestamp DESC`,
      values
    );

    if (format === 'json') {
      return res.json({ status: 'success', data: { audit_logs: result.rows } });
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-export.pdf');

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
      doc.pipe(res);

      doc.fontSize(16).text('Audit Log Export', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#555555');
      doc.text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown(0.8);

      const headers = [
        'Timestamp',
        'Ticket',
        'Action',
        'Entity',
        'Description',
        'User',
        'IP',
      ];

      const columnWidths = [90, 90, 80, 80, 260, 120, 80];
      const rowHeight = 16;
      const startX = doc.x;
      let y = doc.y;

      doc.fontSize(10).fillColor('#111111');
      headers.forEach((header, index) => {
        doc.text(header, startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), y, {
          width: columnWidths[index],
          align: 'left',
        });
      });

      y += rowHeight;
      doc.moveTo(startX, y - 4).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), y - 4).strokeColor('#cccccc').stroke();

      doc.fontSize(9).fillColor('#222222');
      for (const row of result.rows) {
        const values = [
          row.timestamp ? new Date(row.timestamp).toISOString() : '',
          row.ticket_number || row.ticket_id || '',
          row.action_type || '',
          row.entity_type || '',
          row.description || '',
          row.full_name || row.user_id || '',
          row.ip_address || '',
        ];

        if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
        }

        values.forEach((value, index) => {
          doc.text(value, startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), y, {
            width: columnWidths[index],
            align: 'left',
            ellipsis: true,
          });
        });
        y += rowHeight;
      }

      doc.end();
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-export.csv');

    const header = [
      'log_id',
      'ticket_id',
      'ticket_number',
      'user_id',
      'full_name',
      'action_type',
      'entity_type',
      'entity_id',
      'description',
      'ip_address',
      'user_agent',
      'timestamp',
    ].join(',');

    const rows = result.rows.map((row) => [
      escapeCsv(row.log_id),
      escapeCsv(row.ticket_id),
      escapeCsv(row.ticket_number),
      escapeCsv(row.user_id),
      escapeCsv(row.full_name),
      escapeCsv(row.action_type),
      escapeCsv(row.entity_type),
      escapeCsv(row.entity_id),
      escapeCsv(row.description),
      escapeCsv(row.ip_address),
      escapeCsv(row.user_agent),
      escapeCsv(row.timestamp),
    ].join(','));

    return res.send([header, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
