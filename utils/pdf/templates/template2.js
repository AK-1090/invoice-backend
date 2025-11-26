const puppeteer = require("puppeteer");
const QRCode = require("qrcode");

class PDFGeneratorTemplate2 {
  /**
   * Generates a PDF buffer for the given invoice object using Puppeteer
   */
  async generatePDF(invoice) {
    console.log("Starting PDF generation for invoice:", invoice.invoiceNumber);

    let qrDataUrl = null;
    try {
      const qrText = invoice.invoiceNumber || `INV-${Date.now()}`;
      qrDataUrl = await QRCode.toDataURL(String(qrText), {
        margin: 1,
        width: 100,
      });
      console.log("QR code generated successfully");
    } catch (err) {
      console.warn("QR generation failed:", err.message);
    }

    let browser;
    try {
      console.log("Launching Puppeteer...");
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
        ],
      });
      console.log("Puppeteer launched successfully");

      const page = await browser.newPage();
      console.log("New page created");

      // Set a realistic viewport
      await page.setViewport({ width: 1200, height: 1697 });

      const htmlContent = this._generateHTML(invoice, qrDataUrl);
      console.log("HTML content generated, length:", htmlContent.length);

      // Validate HTML content
      if (!htmlContent || htmlContent.length < 100) {
        console.error("HTML content seems too short:", htmlContent);
        throw new Error("HTML content generation failed");
      }

      await page.setContent(htmlContent, {
        waitUntil: ["networkidle0", "load", "domcontentloaded"],
      });
      console.log("Content set on page");

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      console.log("Generating PDF...");
      const pdfResult = await page.pdf({
        format: "A4",
        margin: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
        printBackground: true,
        preferCSSPageSize: true,
      });

      console.log("PDF generated, result type:", typeof pdfResult);
      console.log(
        "PDF generated, result constructor:",
        pdfResult?.constructor?.name
      );
      console.log("PDF generated, isBuffer:", Buffer.isBuffer(pdfResult));
      console.log(
        "PDF generated, isUint8Array:",
        pdfResult instanceof Uint8Array
      );
      console.log("PDF generated, length:", pdfResult?.length);

      // Convert to Buffer if it's a Uint8Array
      let pdfBuffer;
      if (Buffer.isBuffer(pdfResult)) {
        pdfBuffer = pdfResult;
        console.log("PDF is already a Buffer");
      } else if (pdfResult instanceof Uint8Array) {
        pdfBuffer = Buffer.from(pdfResult);
        console.log("Converted Uint8Array to Buffer");
      } else if (pdfResult && typeof pdfResult === "object") {
        // Try to convert any array-like object
        pdfBuffer = Buffer.from(pdfResult);
        console.log("Converted object to Buffer");
      } else {
        console.error("Unknown PDF result type:", typeof pdfResult, pdfResult);
        throw new Error(
          `Puppeteer returned ${typeof pdfResult} instead of Buffer/Uint8Array`
        );
      }

      console.log("Final buffer info:", {
        type: typeof pdfBuffer,
        isBuffer: Buffer.isBuffer(pdfBuffer),
        length: pdfBuffer ? pdfBuffer.length : "undefined",
        firstBytes: pdfBuffer ? pdfBuffer.slice(0, 10).toString("hex") : "none",
      });

      if (!pdfBuffer) {
        throw new Error("Failed to create PDF buffer");
      }

      if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error(
          `Final result is ${typeof pdfBuffer} instead of Buffer`
        );
      }

      if (pdfBuffer.length === 0) {
        throw new Error("PDF buffer is empty");
      }

      // Check PDF header
      const header = pdfBuffer.slice(0, 4).toString();
      if (header !== "%PDF") {
        console.log(
          "First 20 bytes (hex):",
          pdfBuffer.slice(0, 20).toString("hex")
        );
        console.log(
          "First 20 bytes (ascii):",
          pdfBuffer.slice(0, 20).toString()
        );
        throw new Error(
          `Generated buffer does not start with PDF header. Got: ${header}`
        );
      }

      console.log(
        "PDF generation successful, buffer length:",
        pdfBuffer.length
      );
      return pdfBuffer;
    } catch (error) {
      console.error("PDF generation error in template2:", error);
      throw error;
    } finally {
      if (browser) {
        console.log("Closing browser...");
        await browser.close();
        console.log("Browser closed");
      }
    }
  }

  /* ----------------------
     HTML Generation - YOUR BEAUTIFUL TEMPLATE
     ---------------------- */
  _generateHTML(invoice, qrDataUrl) {
    console.log("Generating HTML for invoice:", invoice.invoiceNumber);

    // Calculate totals
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

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoiceNumber || ""}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: white !important;
            min-height: 100vh;
            padding: 0;
            margin: 0;
        }

        .container {
            width: 100%;
            min-height: 100vh;
            background: white;
            position: relative;
            margin: 0;
            border-radius: 0;
            box-shadow: none;
        }

        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: white;
            padding: 50px 40px;
            position: relative;
            overflow: hidden;
            border-bottom: 3px solid #d4af37;
        }

        .header-wave {
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 100%;
            height: 80px;
            background: url('data:image/svg+xml,<svg viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg"><path d="M0,50 Q300,0 600,50 T1200,50 L1200,120 L0,120 Z" fill="white"/></svg>');
            background-repeat: repeat-x;
            background-size: auto 100%;
        }

        .header-content {
            position: relative;
            z-index: 1;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .invoice-number {
            font-size: 14px;
            opacity: 0.9;
            letter-spacing: 1px;
        }

        .content {
            padding: 60px 40px 40px;
            position: relative;
            z-index: 1;
        }

        .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 50px;
        }

        .meta-section {
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.05));
            border: 2px solid rgba(212, 175, 55, 0.4);
            border-radius: 20px;
            padding: 25px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(212, 175, 55, 0.1);
        }

        .meta-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #d4af37, #f0d066, #d4af37);
        }

        .meta-section::after {
            content: '';
            position: absolute;
            bottom: 15px;
            right: 15px;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, rgba(212, 175, 55, 0.15), transparent);
            border-radius: 50%;
            pointer-events: none;
        }

        .meta-section h3 {
            font-size: 12px;
            color: #d4af37;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 12px;
            font-weight: 600;
            position: relative;
            z-index: 1;
        }

        .meta-section p {
            font-size: 14px;
            color: #333;
            line-height: 1.8;
            margin: 4px 0;
            position: relative;
            z-index: 1;
        }

        .date-badge {
            display: inline-block;
            background: linear-gradient(135deg, #d4af37, #f0d066);
            color: #1a1a1a;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            margin-top: 10px;
            font-weight: 600;
        }

        .items-section {
            margin: 40px 0;
            position: relative;
        }

        .items-section::before {
            content: '';
            position: absolute;
            top: -20px;
            left: -20px;
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.1), transparent);
            border-radius: 50%;
            pointer-events: none;
        }

        .items-section::after {
            content: '';
            position: absolute;
            bottom: -30px;
            right: 50px;
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, rgba(118, 75, 162, 0.1), rgba(102, 126, 234, 0.05));
            border-radius: 40% 60% 70% 30%;
            transform: rotate(25deg);
            pointer-events: none;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border: 2px solid rgba(212, 175, 55, 0.3);
            border-radius: 12px;
            overflow: hidden;
        }

        table th {
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.1));
            border-top: 2px solid #d4af37;
            border-bottom: 2px solid #d4af37;
            padding: 15px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #d4af37;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        table td {
            padding: 18px 15px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 14px;
            color: #333;
        }

        table tr:last-child td {
            border-bottom: none;
        }

        table tbody tr:hover {
            background: #f9f9ff;
        }

        .totals {
            display: flex;
            justify-content: flex-end;
            margin: 40px 0;
            position: relative;
        }

        .totals::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            width: 200px;
            height: 200px;
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1));
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
            transform: translateY(-50%) rotate(45deg);
            pointer-events: none;
        }

        .totals::after {
            content: '';
            position: absolute;
            left: 30px;
            top: 20%;
            width: 150px;
            height: 150px;
            background: radial-gradient(circle at 30% 30%, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.05));
            border-radius: 50%;
            pointer-events: none;
            box-shadow: inset -20px -20px 40px rgba(26, 26, 26, 0.1);
        }

        .totals-box {
            width: 300px;
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.05));
            border: 2px solid rgba(212, 175, 55, 0.3);
            border-radius: 15px;
            padding: 25px;
            position: relative;
            overflow: visible;
        }

        .totals-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #d4af37, #f0d066);
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
        }

        .total-row.final {
            border-top: 2px solid rgba(212, 175, 55, 0.3);
            padding-top: 15px;
            font-size: 18px;
            font-weight: 700;
            color: #d4af37;
        }

        .total-label {
            color: #666;
        }

        .total-amount {
            font-weight: 600;
            color: #333;
        }

        .payment-section {
            background: linear-gradient(135deg, #f9f9f9, #f0f0f0);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #d4af37;
            position: relative;
            overflow: hidden;
        }

        .payment-section::before {
            content: '';
            position: absolute;
            top: -50px;
            right: -50px;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(212, 175, 55, 0.1), transparent);
            border-radius: 50%;
            pointer-events: none;
        }

        .payment-section::after {
            content: '';
            position: absolute;
            bottom: -30px;
            left: 80px;
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.05));
            border-radius: 30% 70% 40% 60%;
            transform: rotate(-45deg);
            pointer-events: none;
        }

        .payment-section h4 {
            font-size: 13px;
            color: #d4af37;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            font-weight: 600;
        }

        .payment-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            font-size: 14px;
        }

        .payment-item {
            color: #333;
        }

        .payment-item strong {
            display: block;
            color: #d4af37;
            font-size: 12px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent);
            margin: 40px 0;
        }

        .footer {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: white;
            padding: 60px 40px 40px;
            text-align: center;
            font-size: 14px;
            position: relative;
            overflow: hidden;
            border-top: 3px solid #d4af37;
            margin-top: auto;
        }

        .footer-wave {
            position: absolute;
            top: -1px;
            left: 0;
            width: 100%;
            height: 100px;
            background: url('data:image/svg+xml,<svg viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%25" style="stop-color:%23d4af37;stop-opacity:1" /><stop offset="100%25" style="stop-color:%23d4af37;stop-opacity:0" /></linearGradient></defs><path d="M0,60 Q150,30 300,60 T600,60 T900,60 T1200,60 L1200,0 L0,0 Z" fill="url(%23waveGradient)" opacity="0.2"/><path d="M0,70 Q200,40 400,70 T800,70 T1200,70 L1200,0 L0,0 Z" fill="url(%23waveGradient)" opacity="0.1"/></svg>');
            background-repeat: repeat-x;
            background-size: auto 100%;
        }

        .footer-content {
            position: relative;
            z-index: 1;
        }

        .thank-you {
            font-style: italic;
            color: #d4af37;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-content">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">${
                  invoice.invoiceNumber || "INV-0000"
                }</div>
            </div>
            <div class="header-wave"></div>
        </div>

        <!-- Main Content -->
        <div class="content">
            <!-- Invoice Meta -->
            <div class="invoice-meta">
                <div>
                    <div class="meta-section">
                        <h3>Bill From</h3>
                        <p><strong>${
                          invoice.from?.name || "Company Name"
                        }</strong></p>
                        <p>${invoice.from?.address || ""}</p>
                        <p>${invoice.from?.city || ""}, ${
      invoice.from?.state || ""
    } ${invoice.from?.zip || ""}</p>
                        <p>${invoice.from?.email || ""}</p>
                    </div>
                </div>
                <div>
                    <div class="meta-section">
                        <h3>Bill To</h3>
                        <p><strong>${
                          invoice.to?.name || "Client Name"
                        }</strong></p>
                        <p>${invoice.to?.address || ""}</p>
                        <p>${invoice.to?.city || ""}, ${
      invoice.to?.state || ""
    } ${invoice.to?.zip || ""}</p>
                        <p>${invoice.to?.email || ""}</p>
                    </div>
                    <div class="date-badge">${this._formatDate(
                      invoice.issueDate
                    )}</div>
                </div>
            </div>

            <!-- Divider -->
            <div class="divider"></div>

            <!-- Items Table -->
            <div class="items-section">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(invoice.items || [])
                          .map(
                            (item) => `
                            <tr>
                                <td>${item.description || "Item"}</td>
                                <td>${item.quantity || 1}</td>
                                <td style="text-align: right;">Rs.${Number(
                                  item.price || 0
                                ).toFixed(2)}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>

            <!-- Divider -->
            <div class="divider"></div>

            <!-- Totals -->
            <div class="totals">
                <div class="totals-box">
                    <div class="total-row">
                        <span class="total-label">Subtotal</span>
                        <span class="total-amount">Rs.${subtotal.toFixed(
                          2
                        )}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">Tax (${taxRate}%)</span>
                        <span class="total-amount">Rs.${taxAmount.toFixed(
                          2
                        )}</span>
                    </div>
                    ${
                      discountRate > 0
                        ? `
                    <div class="total-row">
                        <span class="total-label">Discount (${discountRate}%)</span>
                        <span class="total-amount">-Rs.${discountAmount.toFixed(
                          2
                        )}</span>
                    </div>
                    `
                        : ""
                    }
                    <div class="total-row final">
                        <span class="total-label">Total</span>
                        <span>Rs.${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Payment Section -->
            <div class="payment-section">
                <h4>Payment Details</h4>
                <div class="payment-details">
                    <div class="payment-item">
                        <strong>Account</strong>
                        ${invoice.from?.email || ""}
                    </div>
                    <div class="payment-item">
                        <strong>Bank</strong>
                        ${invoice.from?.name || ""}
                    </div>
                </div>
                ${
                  qrDataUrl
                    ? `
                <div style="text-align: center; margin-top: 20px;">
                    <img src="${qrDataUrl}" alt="QR Code" style="width: 100px; height: 100px;">
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">Scan to pay</div>
                </div>
                `
                    : ""
                }
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-wave"></div>
            <div class="footer-content">
                <p class="thank-you">Thank you for your business!</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    console.log("HTML generation completed, length:", html.length);
    return html;
  }

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

// Export with explicit methods
const instance = new PDFGeneratorTemplate2();
module.exports = {
  generatePDF: instance.generatePDF.bind(instance),
  generate: instance.generatePDF.bind(instance),
};
