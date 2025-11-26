const express = require("express");
const router = express.Router();
const Invoice = require("../models/invoice");
const pdf = require("../utils/pdf");

// GET all invoices (with search + pagination)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = search
      ? {
          $or: [
            { invoiceNumber: { $regex: search, $options: "i" } },
            { "from.name": { $regex: search, $options: "i" } },
            { "to.name": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single invoice
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE invoice
router.post("/", async (req, res) => {
  try {
    if (!req.body.from || !req.body.to) {
      return res.status(400).json({
        success: false,
        message: "Sender and recipient details are required",
      });
    }

    if (!req.body.items || req.body.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    // Validate items
    for (const item of req.body.items) {
      if (!item.description || item.quantity <= 0 || item.price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a description, quantity > 0, price > 0",
        });
      }
    }

    // Generate invoice number
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    let nextNumber = 1;

    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.split("-")[1]);
      nextNumber = isNaN(lastNum) ? 1 : lastNum + 1;
    }

    const invoiceNumber = `INV-${String(nextNumber).padStart(4, "0")}`;

    // Calculate totals securely
    const subtotal = req.body.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const taxRate = req.body.taxRate || 0;
    const discountRate = req.body.discountRate || 0;

    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discountRate / 100);

    const total = subtotal + taxAmount - discountAmount;

    const invoiceData = {
      ...req.body,
      invoiceNumber,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      createdAt: new Date(),
    };

    const invoice = new Invoice(invoiceData);
    const savedInvoice = await invoice.save();

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: savedInvoice,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Invoice number already exists",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE invoice
router.put("/:id", async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE invoice
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Invoice.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GENERATE PDF
// MULTI TEMPLATE PDF GENERATION
// GENERATE PDF - FIXED VERSION
router.get("/:id/pdf", async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const template = req.query.template || "template1";

    console.log(`Generating PDF for invoice ${invoiceId} with template ${template}`);

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    // Generate PDF using selected template
    const pdfBuffer = await pdf.generatePDF(invoice, template);

    // Validate PDF buffer
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      console.error('Invalid PDF buffer generated:', { 
        type: typeof pdfBuffer, 
        isBuffer: Buffer.isBuffer(pdfBuffer) 
      });
      return res.status(500).json({ 
        success: false, 
        message: "Failed to generate PDF: Invalid buffer" 
      });
    }

    // Check if it's a valid PDF (should start with %PDF)
    if (pdfBuffer.length < 10 || pdfBuffer.slice(0, 4).toString() !== '%PDF') {
      console.error('Generated buffer is not a valid PDF');
      console.log('Buffer first 10 bytes:', pdfBuffer.slice(0, 10).toString());
      return res.status(500).json({ 
        success: false, 
        message: "Failed to generate valid PDF" 
      });
    }

    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Set headers and send
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || invoiceId}.pdf"`,
    });

    return res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate PDF",
      error: error.message 
    });
  }
});

module.exports = router;
