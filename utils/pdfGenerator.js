// backend/utils/pdfGenerator.js
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

class PDFGenerator {
  /**
   * Generates a PDF buffer for the given invoice object.
   * Uses QRCode.toDataURL internally so this function is async.
   *
   * @param {Object} invoice
   * @returns {Promise<Buffer>}
   */
  async generatePDF(invoice) {
    // pre-generate QR (dataURL -> buffer)
    let qrBuffer = null;
    try {
      // Use invoice.invoiceNumber or fallback
      const qrText = invoice.invoiceNumber || `INV-${Date.now()}`;
      const dataUrl = await QRCode.toDataURL(String(qrText), {
        margin: 1,
        width: 300,
      });
      qrBuffer = Buffer.from(dataUrl.split(",")[1], "base64");
    } catch (err) {
      // If QR generation fails, proceed without QR (qrBuffer stays null)
      console.warn("QR generation failed:", err && err.message);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          info: {
            Title: `Invoice ${invoice.invoiceNumber || ""}`,
            Author: (invoice.from && invoice.from.name) || "Invoice Generator",
          },
        });

        const buffers = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        // Build the invoice content
        this._build(doc, invoice, qrBuffer);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /* ----------------------
     Core build process
     ---------------------- */
  _build(doc, invoice, qrBuffer) {
    const pageWidth = doc.page.width;

    // Draw background waves (3 layers - soft pastel greens)
    this._drawWaves(doc, pageWidth);

    // Header: logo + company details + invoice box
    this._drawHeader(doc, invoice, pageWidth);

    // Bill To
    this._drawBillTo(doc, invoice);

    // Items table (returns the bottom y)
    const tableBottomY = this._drawItemsTable(doc, invoice);

    // Totals box below table (dynamic)
    const totalsBottomY = this._drawTotalsBox(doc, invoice, tableBottomY);

    // Footer: payment details, QR, center thank you
    this._drawFooter(doc, invoice, pageWidth, totalsBottomY, qrBuffer);
  }

  /* ----------------------
     Wave decorations (top + bottom)
     Soft pastel greens: Option C colors
     (#d4f8e8, #b4f1d2, #94eac0)
     ---------------------- */
  _drawWaves(doc, pageWidth) {
    const left = 0;
    const right = pageWidth;

    // Top layer (lightest)
    doc
      .save()
      .opacity(1)
      .fillColor("#d4f8e8")
      .moveTo(left, 0)
      .lineTo(right, 0)
      .lineTo(right, 80)
      .bezierCurveTo(right * 0.75, 110, right * 0.25, 40, left, 90)
      .closePath()
      .fill()
      .restore();

    // Middle layer
    doc
      .save()
      .opacity(1)
      .fillColor("#b4f1d2")
      .moveTo(left, 0)
      .lineTo(right, 0)
      .lineTo(right, 60)
      .bezierCurveTo(right * 0.75, 90, right * 0.25, 20, left, 70)
      .closePath()
      .fill()
      .restore();

    // Foreground wave (slightly darker)
    doc
      .save()
      .opacity(1)
      .fillColor("#94eac0")
      .moveTo(left, 0)
      .lineTo(right, 0)
      .lineTo(right, 40)
      .bezierCurveTo(right * 0.75, 70, right * 0.25, 0, left, 60)
      .closePath()
      .fill()
      .restore();

    // Bottom waves: mirror near bottom
    const pageHeight = doc.page.height;
    const bottomY = pageHeight - 120;

    // Foreground bottom
    doc
      .save()
      .fillColor("#94eac0")
      .moveTo(left, pageHeight)
      .lineTo(right, pageHeight)
      .lineTo(right, bottomY + 40)
      .bezierCurveTo(
        right * 0.75,
        bottomY + 10,
        right * 0.25,
        bottomY + 130,
        left,
        bottomY + 30
      )
      .closePath()
      .fill()
      .restore();

    // Middle bottom
    doc
      .save()
      .fillColor("#b4f1d2")
      .moveTo(left, pageHeight)
      .lineTo(right, pageHeight)
      .lineTo(right, bottomY + 80)
      .bezierCurveTo(
        right * 0.75,
        bottomY + 40,
        right * 0.25,
        bottomY + 80,
        left,
        bottomY + 50
      )
      .closePath()
      .fill()
      .restore();

    // Top bottom (lightest)
    doc
      .save()
      .fillColor("#d4f8e8")
      .moveTo(left, pageHeight)
      .lineTo(right, pageHeight)
      .lineTo(right, bottomY + 110)
      .bezierCurveTo(
        right * 0.75,
        bottomY + 80,
        right * 0.25,
        bottomY + 120,
        left,
        bottomY + 90
      )
      .closePath()
      .fill()
      .restore();
  }

  /* ----------------------
     Header: fake logo (vector), company details, invoice box
     ---------------------- */
  _drawHeader(doc, invoice, pageWidth) {
    const left = 40;
    const top = 90;

    // Fake logo (circle + initials)
    const logoX = left;
    const logoY = 90;
    const logoSize = 50;

    // Circle background
    doc
      .save()
      .circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2)
      .fill("#2e8b57")
      .restore();

    // initials
    const initials =
      invoice.from && invoice.from.name
        ? this._getInitials(invoice.from.name)
        : "SG";
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(initials, logoX + 8, logoY + 12);

    // Company name (right to logo)
    const companyLeft = logoX + logoSize + 12;
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#064e3b")
      .text(invoice.from.name || "Company Name", companyLeft, logoY + 4);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#234e3a")
      .text(invoice.from.email || "", companyLeft, logoY + 32);

    // FROM Address under email
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#234e3a")
      .text(invoice.from.address || "", companyLeft, logoY + 48, {
        width: 260,
      });

    doc.text(
      `${invoice.from.city || ""}, ${invoice.from.state || ""} ${
        invoice.from.zip || ""
      }`,
      companyLeft,
      logoY + 62,
      { width: 260 }
    );

    // INVOICE box on right
    const boxWidth = 230;
    const boxX = pageWidth - 40 - boxWidth;
    const boxY = logoY;

    doc
      .save()
      .opacity(0) // make it transparent
      .roundedRect(boxX, boxY - 6, boxWidth, 92, 10)
      .stroke()
      .restore();
    // ensure shape exists
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#2e8b57")
      .roundedRect(boxX, boxY - 6, boxWidth, 92, 10)
      .stroke()
      .restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#2e8b57")
      .text("INVOICE #", boxX + 16, boxY + 4);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#000")
      .text(invoice.invoiceNumber || "-", boxX + 16, boxY + 22);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#2e8b57")
      .text("Date", boxX + 16, boxY + 44);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#000")
      .text(this._formatDate(invoice.issueDate), boxX + 16, boxY + 62);
  }

  /* ----------------------
     Bill To section (wrapped, robust)
     ---------------------- */
  _drawBillTo(doc, invoice) {
    const left = 40;
    const startY = 200;

    this._drawLine(doc, startY - 6);

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#083f2f")
      .text("Bill To:", left, startY);

    const nameY = startY + 28;
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#000")
      .text(invoice.to?.name || "-", left, nameY);

    // Address with wrapping width to avoid overlap
    const addressY = nameY + 18;
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#2f3f3f")
      .text(invoice.to?.address || "-", left, addressY, {
        width: 380,
        lineGap: 2,
      });

    // After address, doc.y gives the current y; set subsequent texts using doc.y
    const afterAddressY = doc.y + 6;

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#2f3f3f")
      .text(
        `${invoice.to?.city || ""}${invoice.to?.city ? ", " : ""}${
          invoice.to?.state || ""
        } ${invoice.to?.zip || ""}`,
        left,
        afterAddressY
      );

    doc.text(invoice.to?.email || "", left, afterAddressY + 16);

    this._drawLine(doc, afterAddressY + 44);
  }

  /* ----------------------
     Items table (no overflow; fixed bounding boxes)
     ---------------------- */
 _drawItemsTable(doc, invoice) {
    const left = 40;
    const top = 320;
    const pageWidth = doc.page.width;
    const tableWidth = pageWidth - 80;

    // Column widths (balanced for equal spacing)
    const descW = Math.floor(tableWidth * 0.50);  // Reduced for better balance
    const qtyW = Math.floor(tableWidth * 0.20);   // Increased for better centering
    const amtW = tableWidth - descW - qtyW;       // Remaining space

    // Calculate total table height
    const headerHeight = 30;
    const rowHeight = 28;
    const totalRows = invoice.items?.length || 0;
    const tableHeight = headerHeight + (totalRows * rowHeight);

    // Draw complete table border
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#2e8b57")
      .rect(left, top, tableWidth, tableHeight)
      .stroke()
      .restore();

    // Header row: background
    doc
      .save()
      .fillColor("#2e8b57")
      .rect(left, top, tableWidth, headerHeight)
      .fill()
      .restore();

    // Header text (white) - perfectly centered
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#fff");
    
    // Calculate vertical center for header
    const headerTextY = top + (headerHeight - 13) / 2 + 2;

    // All headers perfectly centered in their columns
    doc.text("Description", left, headerTextY, { 
      width: descW, 
      align: "center" 
    });
    
    doc.text("Quantity", left + descW, headerTextY, {
      width: qtyW,
      align: "center",
    });
    
    doc.text("Amount", left + descW + qtyW, headerTextY, {
      width: amtW,
      align: "center",
    });

    // Draw row borders and data
    let y = top + headerHeight;

    invoice.items = invoice.items || [];
    invoice.items.forEach((item, idx) => {
      // Draw row border
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor("#d0d7d3")
        .rect(left, y, tableWidth, rowHeight)
        .stroke()
        .restore();

      // Alternating background
      if (idx % 2 === 0) {
        doc
          .save()
          .fillColor("#f7faf7")
          .rect(left + 1, y + 1, tableWidth - 2, rowHeight - 2)
          .fill()
          .restore();
      }

      // Calculate vertical center for item text
      const itemTextY = y + (rowHeight - 12) / 2 + 1;

      // All data perfectly centered in their columns
      doc.font("Helvetica").fontSize(12).fillColor("#000");
      
      // Description - centered with proper bounds
      doc.text(String(item.description || "-"), left, itemTextY, {
        width: descW,
        align: "center",
      });

      // Quantity - centered
      doc.text(String(item.quantity || 0), left + descW, itemTextY, {
        width: qtyW,
        align: "center",
      });

      // Amount - centered
      const amountText = `Rs.${Number(item.price || 0).toFixed(2)}`;
      doc.text(amountText, left + descW + qtyW, itemTextY, {
        width: amtW,
        align: "center",
      });

      y += rowHeight;
    });

    return y + 12;
  }
  /* ----------------------
     Totals box (right side, dynamic)
     ---------------------- */
  _drawTotalsBox(doc, invoice, startY) {
    const boxWidth = 280;
    const boxX = doc.page.width - 40 - boxWidth;
    const boxY = startY + 8;

    const boxHeight = 130;
    doc
      .save()
      .lineWidth(1)
      .strokeColor("#2e8b57")
      .roundedRect(boxX, boxY, boxWidth, boxHeight, 8)
      .stroke()
      .restore();

    let py = boxY + 14;

    // Helper prints label left, value right in fixed columns inside box
    const printLine = (label, value) => {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#333")
        .text(label, boxX + 14, py, { width: boxWidth * 0.55 });
      doc.text(value, boxX + 14 + boxWidth * 0.55, py, {
        width: boxWidth * 0.45 - 18,
        align: "right",
      });
      py += 22;
    };

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

    printLine("Subtotal", `Rs.${subtotal.toFixed(2)}`);
    printLine(`Tax (${taxRate}%)`, `Rs.${taxAmount.toFixed(2)}`);

    if (discountRate > 0) {
      printLine(
        `Discount (${discountRate}%)`,
        `-Rs.${discountAmount.toFixed(2)}`
      );
    }

    // Divider
    doc
      .save()
      .strokeColor("#e6eaea")
      .lineWidth(1)
      .moveTo(boxX + 10, py)
      .lineTo(boxX + boxWidth - 10, py)
      .stroke()
      .restore();
    py += 8;

    // Total
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#2e8b57")
      .text("Total", boxX + 14, py, { width: boxWidth * 0.55 });

    doc.text(`Rs.${total.toFixed(2)}`, boxX + 14 + boxWidth * 0.55, py, {
      width: boxWidth * 0.45 - 18,
      align: "right",
    });

    return boxY + boxHeight; // bottom of totals area
  }

  /* ----------------------
     Footer: payment details, QR, centered thank you
     ---------------------- */
    _drawFooter(doc, invoice, pageWidth, lastY, qrBuffer) {
    const footerTop = Math.min(lastY + 28, doc.page.height - 160);

    this._drawLine(doc, footerTop);

    // Payment details left
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#083f2f")
      .text("Payment Details:", 40, footerTop + 12);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#2f3f3f")
      .text(
        `Account: ${invoice.from?.email || "-"} | Bank: ${
          invoice.from?.name || "-"
        }`,
        40,
        footerTop + 32,
        { width: pageWidth - 320 }
      );

    // QR code positioning - moved higher to avoid overlap
    if (qrBuffer) {
      try {
        const qrSize = 70;
        const qrX = pageWidth - 40 - qrSize;
        const qrY = footerTop + 8; // Position QR code higher
        
        // Draw QR code
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
        
        // Label under QR
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#2f3f3f")
          .text("Scan to pay", qrX, qrY + qrSize + 6, {
            width: qrSize,
            align: "center",
          });
      } catch (err) {
        console.warn("Failed to place QR:", err && err.message);
      }
    }

    // Calculate safe position for green strip - below QR code
    const qrBottomY = footerTop + 8 + 70 + 20; // QR Y + QR height + label space
    const stripY = Math.max(footerTop + 75, qrBottomY); // Use whichever is lower
    
    // Gradient small strip above thank-you - positioned safely
    doc
      .save()
      .fillColor("#b4f1d2")
      .rect(40, stripY, pageWidth - 80, 4)
      .fill()
      .restore();

    // Centered thank-you message
    doc
      .font("Helvetica")
      .fontSize(16)
      .fillColor("#0f3b2f")
      .text("Thank you for your business!", 40, stripY + 14, {
        width: pageWidth - 80,
        align: "center",
      });
  }

  /* ----------------------
     Utilities
     ---------------------- */
  _drawLine(doc, y) {
    doc
      .save()
      .lineWidth(0.7)
      .strokeColor("#d1d7d5")
      .moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .stroke()
      .restore();
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

module.exports = new PDFGenerator();
