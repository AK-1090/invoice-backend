const PDFDocument = require("pdfkit");

module.exports.generate = async function (invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      let buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;

      // Blue header bar
      doc.rect(0, 0, pageWidth, 70).fill("#0A5AD9");
      doc.fillColor("#fff").fontSize(22).text(invoice.from?.name || "Company", 50, 25);
      doc.fillColor("#000").moveDown(3);

      // Right side invoice details
      doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber}`, { align: "right" });
      doc.text(`Date: ${invoice.issueDate}`, { align: "right" });

      doc.moveDown(1.5);

      doc.fontSize(14).text("Bill To:");
      doc.fontSize(10).text(invoice.to?.name || "-");
      doc.text(invoice.to?.address || "-");

      doc.moveDown(1);

      doc.fontSize(12).text("Description", 50);
      doc.text("Qty", 360);
      doc.text("Amount", 450);

      doc.moveDown(0.5);

      (invoice.items || []).forEach((item) => {
        doc.text(item.description || "-", 50);
        doc.text(String(item.quantity || 0), 360);
        doc.text(`Rs.${Number(item.price || 0).toFixed(2)}`, 450);
        doc.moveDown(0.2);
      });

      doc.moveDown(1);
      doc.fontSize(12).text(`Subtotal: Rs.${invoice.subtotal.toFixed(2)}`, { align: "right" });
      doc.text(`Tax: Rs.${invoice.taxAmount.toFixed(2)}`, { align: "right" });
      doc.fontSize(14).text(`Total: Rs.${invoice.total.toFixed(2)}`, { align: "right" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
