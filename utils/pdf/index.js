const path = require("path");

// Load templates
const templates = {
  template1: require(path.join(__dirname, "templates", "template1")),
  template2: require(path.join(__dirname, "templates", "template2")),
  template3: require(path.join(__dirname, "templates", "template3")),
  template4: require(path.join(__dirname, "templates", "template4")),
};

console.log('Available templates:', Object.keys(templates));

/**
 * Generate a PDF Buffer for the invoice using the requested template.
 */
async function generatePDF(invoice, templateName = "template1") {
  const tpl = templates[templateName] || templates["template1"];

  if (!tpl) {
    throw new Error(`Template ${templateName} not found`);
  }

  console.log(`Using template: ${templateName}`);
  console.log('Template type:', typeof tpl);
  console.log('Template keys:', Object.keys(tpl));

  try {
    let result;

    // Try different export patterns
    if (typeof tpl.generate === "function") {
      console.log('Calling tpl.generate()');
      result = await tpl.generate(invoice);
    } else if (typeof tpl.generatePDF === "function") {
      console.log('Calling tpl.generatePDF()');
      result = await tpl.generatePDF(invoice);
    } else if (typeof tpl === "function") {
      console.log('Template is function, calling it');
      const instance = tpl();
      if (instance && typeof instance.generatePDF === "function") {
        result = await instance.generatePDF(invoice);
      }
    } else {
      throw new Error(`Template ${templateName} has no valid generate method`);
    }

    console.log('Generation completed, result:', {
      type: typeof result,
      isBuffer: Buffer.isBuffer(result),
      length: result ? (Buffer.isBuffer(result) ? result.length : 'not buffer') : 'null'
    });

    if (!result) {
      throw new Error('Template returned null or undefined');
    }

    if (!Buffer.isBuffer(result)) {
      throw new Error(`Template returned ${typeof result} instead of Buffer`);
    }

    if (result.length === 0) {
      throw new Error('Template returned empty buffer');
    }

    // Check if it's a valid PDF
    if (result.slice(0, 4).toString() !== '%PDF') {
      console.log('First 50 bytes:', result.slice(0, 50).toString());
      throw new Error('Generated content is not a valid PDF');
    }

    return result;

  } catch (error) {
    console.error(`Error generating PDF with template ${templateName}:`, error);
    throw error;
  }
}

module.exports = {
  generatePDF,
};