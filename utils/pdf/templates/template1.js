// backend/utils/pdfGenerator.js
const pdfGenerator = require("../../pdfGenerator");
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');


class PDFGenerator {
  /**
   * Generates a PDF buffer for the given invoice object using Puppeteer
   *
   * @param {Object} invoice
   * @returns {Promise<Buffer>}
   */
  async generatePDF(invoice) {
    let qrDataUrl = null;
    try {
      const qrText = invoice.invoiceNumber || `INV-${Date.now()}`;
      qrDataUrl = await QRCode.toDataURL(String(qrText), {
        margin: 1,
        width: 300,
      });
    } catch (err) {
      console.warn("QR generation failed:", err && err.message);
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Generate HTML content
      const htmlContent = this._generateHTML(invoice, qrDataUrl);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '40px',
          right: '40px',
          bottom: '40px',
          left: '40px'
        },
        printBackground: true
      });

      return pdfBuffer;

    } finally {
      await browser.close();
    }
  }

  /* ----------------------
     HTML Generation
     ---------------------- */
  _generateHTML(invoice, qrDataUrl) {
    const subtotal = Number(invoice.subtotal || 0);
    const taxRate = Number(invoice.taxRate || 0);
    const taxAmount = Number(invoice.taxAmount || (subtotal * taxRate) / 100);
    const discountRate = Number(invoice.discountRate || 0);
    const discountAmount = Number(
      invoice.discountAmount || (subtotal * discountRate) / 100
    );
    const total = Number(
      invoice.total || Math.max(0, subtotal + taxAmount - discountAmount)
    );

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@300;400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #333;
            line-height: 1.4;
            position: relative;
            min-height: 100vh;
            background: white;
        }
        
        /* Wave backgrounds */
        .wave-top {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 120px;
            overflow: hidden;
            z-index: -1;
        }
        
        .wave-layer {
            position: absolute;
            width: 100%;
            height: 100%;
        }
        
        .wave-1 { background: #d4f8e8; }
        .wave-2 { background: #b4f1d2; }
        .wave-3 { background: #94eac0; }
        
        .wave-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 120px;
            overflow: hidden;
            z-index: -1;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-top: 20px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo {
            width: 50px;
            height: 50px;
            background: #2e8b57;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        
        .company-info h1 {
            color: #064e3b;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        
        .company-info .email {
            color: #234e3a;
            font-size: 11px;
            margin-bottom: 4px;
        }
        
        .company-info .address {
            color: #234e3a;
            font-size: 10px;
            line-height: 1.3;
        }
        
        .invoice-box {
            border: 1px solid #2e8b57;
            border-radius: 10px;
            padding: 16px;
            width: 230px;
            background: transparent;
        }
        
        .invoice-label {
            color: #2e8b57;
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 4px;
        }
        
        .invoice-value {
            color: #000;
            font-size: 12px;
            margin-bottom: 12px;
        }
        
        /* Bill To */
        .bill-to {
            margin: 40px 0;
            padding: 20px 0;
            border-top: 0.7px solid #d1d7d5;
            border-bottom: 0.7px solid #d1d7d5;
        }
        
        .bill-to h2 {
            color: #083f2f;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        .bill-to .name {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 12px;
        }
        
        .bill-to .address {
            color: #2f3f3f;
            font-size: 11px;
            line-height: 1.4;
            margin-bottom: 8px;
        }
        
        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 40px 0;
        }
        
        .items-table th {
            background: #2e8b57;
            color: white;
            font-weight: bold;
            font-size: 13px;
            padding: 8px;
            text-align: center;
            border: 1px solid #2e8b57;
        }
        
        .items-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #d0d7d3;
            font-size: 12px;
        }
        
        .items-table tr:nth-child(even) {
            background: #f7faf7;
        }
        
        .items-table .description { width: 50%; }
        .items-table .quantity { width: 20%; }
        .items-table .amount { width: 30%; }
        
        /* Totals Box */
        .totals-box {
            border: 1px solid #2e8b57;
            border-radius: 8px;
            padding: 14px;
            width: 280px;
            margin-left: auto;
            margin-bottom: 40px;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
            font-size: 12px;
        }
        
        .total-line:last-of-type {
            margin-bottom: 8px;
        }
        
        .divider {
            border-top: 1px solid #e6eaea;
            margin: 8px 0;
        }
        
        .total-final {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 16px;
            color: #2e8b57;
            margin-top: 8px;
        }
        
        /* Footer */
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 0.7px solid #d1d7d5;
            position: relative;
        }
        
        .payment-details h3 {
            color: #083f2f;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .payment-details p {
            color: #2f3f3f;
            font-size: 11px;
        }
        
        .qr-code {
            position: absolute;
            right: 0;
            top: 0;
            text-align: center;
        }
        
        .qr-code img {
            width: 70px;
            height: 70px;
        }
        
        .qr-label {
            font-size: 9px;
            color: #2f3f3f;
            margin-top: 4px;
        }
        
        .thank-you-strip {
            background: #b4f1d2;
            height: 4px;
            margin: 20px 0 8px 0;
        }
        
        .thank-you {
            text-align: center;
            color: #0f3b2f;
            font-size: 16px;
            margin: 14px 0;
        }
    </style>
</head>
<body>
    <!-- Wave Backgrounds -->
    <div class="wave-top">
        <div class="wave-layer wave-1"></div>
        <div class="wave-layer wave-2"></div>
        <div class="wave-layer wave-3"></div>
    </div>
    
    <div class="wave-bottom">
        <div class="wave-layer wave-3"></div>
        <div class="wave-layer wave-2"></div>
        <div class="wave-layer wave-1"></div>
    </div>

    <!-- Header -->
    <div class="header">
        <div class="logo-section">
            <div class="logo">${this._getInitials(invoice.from?.name)}</div>
            <div class="company-info">
                <h1>${invoice.from?.name || "Company Name"}</h1>
                <div class="email">${invoice.from?.email || ""}</div>
                <div class="address">
                    ${invoice.from?.address || ""}<br>
                    ${invoice.from?.city || ""}${invoice.from?.city ? ', ' : ''}${invoice.from?.state || ''} ${invoice.from?.zip || ''}
                </div>
            </div>
        </div>
        
        <div class="invoice-box">
            <div class="invoice-label">INVOICE #</div>
            <div class="invoice-value">${invoice.invoiceNumber || "-"}</div>
            <div class="invoice-label">Date</div>
            <div class="invoice-value">${this._formatDate(invoice.issueDate)}</div>
        </div>
    </div>

    <!-- Bill To -->
    <div class="bill-to">
        <h2>Bill To:</h2>
        <div class="name">${invoice.to?.name || "-"}</div>
        <div class="address">
            ${invoice.to?.address || "-"}<br>
            ${invoice.to?.city || ""}${invoice.to?.city ? ', ' : ''}${invoice.to?.state || ''} ${invoice.to?.zip || ''}<br>
            ${invoice.to?.email || ""}
        </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th class="description">Description</th>
                <th class="quantity">Quantity</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${(invoice.items || []).map(item => `
                <tr>
                    <td>${item.description || "-"}</td>
                    <td>${item.quantity || 0}</td>
                    <td>Rs.${Number(item.price || 0).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <!-- Totals Box -->
    <div class="totals-box">
        <div class="total-line">
            <span>Subtotal</span>
            <span>Rs.${subtotal.toFixed(2)}</span>
        </div>
        <div class="total-line">
            <span>Tax (${taxRate}%)</span>
            <span>Rs.${taxAmount.toFixed(2)}</span>
        </div>
        ${discountRate > 0 ? `
        <div class="total-line">
            <span>Discount (${discountRate}%)</span>
            <span>-Rs.${discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="total-final">
            <span>Total</span>
            <span>Rs.${total.toFixed(2)}</span>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="payment-details">
            <h3>Payment Details:</h3>
            <p>Account: ${invoice.from?.email || "-"} | Bank: ${invoice.from?.name || "-"}</p>
        </div>
        
        ${qrDataUrl ? `
        <div class="qr-code">
            <img src="${qrDataUrl}" alt="QR Code">
            <div class="qr-label">Scan to pay</div>
        </div>
        ` : ''}
        
        <div class="thank-you-strip"></div>
        <div class="thank-you">Thank you for your business!</div>
    </div>
</body>
</html>
    `;
  }

  /* ----------------------
     Utilities
     ---------------------- */
  _formatDate(date) {
    if (!date) return "-";
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return String(date);
    }
  }

  _getInitials(name) {
    if (!name) return "SG";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}


module.exports.generate = async function (invoice) {
  return pdfGenerator.generatePDF(invoice);
};