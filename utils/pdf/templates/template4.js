const PDFDocument = require("pdfkit");

module.exports.generate = async function (invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      let buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Outer border
      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80).stroke("#000");

      doc.fontSize(20).text(invoice.from?.name || "Company", 60, 60);
      doc.fontSize(10).text(invoice.from?.address || "", 60, 85);

      // Invoice info box
      doc.rect(doc.page.width - 220, 60, 160, 60).stroke();
      doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber}`, doc.page.width - 210, 70);
      doc.text(`Date: ${invoice.issueDate}`, doc.page.width - 210, 95);

      doc.moveDown(6);

      doc.fontSize(14).text("Bill To:");
      doc.fontSize(10).text(invoice.to?.name || "-", 60);
      doc.text(invoice.to?.address || "-", 60);

      doc.moveDown(2);

      let y = 250;
      doc.fontSize(12).text("Description", 60, y);
      doc.text("Qty", 350, y);
      doc.text("Amount", 450, y);

      y += 20;

      (invoice.items || []).forEach((item) => {
        doc.text(item.description || "-", 60, y);
        doc.text(String(item.quantity || 0), 350, y);
        doc.text(`Rs.${Number(item.price || 0).toFixed(2)}`, 450, y);
        y += 20;
      });

      // Totals
      doc.text(`Subtotal: Rs.${invoice.subtotal.toFixed(2)}`, 350, y + 20);
      doc.text(`Tax: Rs.${invoice.taxAmount.toFixed(2)}`, 350, y + 40);
      doc.fontSize(14).text(`Total: Rs.${invoice.total.toFixed(2)}`, 350, y + 70);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
