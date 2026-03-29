const Tesseract = require('tesseract.js');

/**
 * Extracts structured expense data from a receipt image using Tesseract OCR.
 * @param {string} imagePath - local file path to the uploaded receipt
 * @returns {Object} parsed fields: amount, currency, date, vendor, description, expenseType, expenseLines
 */
const parseReceipt = async (imagePath) => {
  const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
  return extractFields(text);
};

const extractFields = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  // --- Amount ---
  // Match patterns like: Total: $45.00 | TOTAL 45.00 | Amount: 1,234.56
  const amountMatch = text.match(/(?:total|amount|grand total|subtotal)[^\d]*(\d{1,6}[.,]\d{2})/i)
    || text.match(/\$\s*(\d{1,6}[.,]\d{2})/)
    || text.match(/(\d{1,6}[.,]\d{2})\s*(?:USD|INR|EUR|GBP)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  // --- Currency ---
  const currencyMatch = text.match(/\b(USD|INR|EUR|GBP|AED|SGD|CAD|AUD)\b/i);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : (text.includes('$') ? 'USD' : null);

  // --- Date ---
  // Matches: 12/25/2024 | 25-12-2024 | Dec 25, 2024 | 2024-12-25
  const dateMatch = text.match(
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/
  ) || text.match(
    /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/
  ) || text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i
  );
  const rawDate = dateMatch ? dateMatch[0] : null;
  let date = null;
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed)) date = parsed.toISOString().split('T')[0];
  }

  // --- Vendor / Restaurant name ---
  // Usually the first 1-3 non-empty lines before any item list
  const vendor = lines.slice(0, 3).find((l) => l.length > 2 && !/^\d/.test(l)) || null;

  // --- Expense Type (category) ---
  const typeMap = {
    Meals: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'pizza', 'burger', 'hotel restaurant', 'bar', 'bistro'],
    Travel: ['taxi', 'uber', 'lyft', 'airline', 'flight', 'train', 'bus', 'fuel', 'petrol', 'parking', 'toll'],
    Accommodation: ['hotel', 'inn', 'lodge', 'airbnb', 'resort', 'motel'],
    'Office Supplies': ['stationery', 'office', 'supplies', 'printer', 'ink', 'paper'],
    Training: ['course', 'training', 'seminar', 'workshop', 'conference', 'certification'],
  };
  let expenseType = 'Other';
  for (const [type, keywords] of Object.entries(typeMap)) {
    if (keywords.some((kw) => fullText.includes(kw))) {
      expenseType = type;
      break;
    }
  }

  // --- Expense Lines (individual items) ---
  // Match lines that look like: "Item name   12.50"
  const expenseLines = [];
  const lineItemRegex = /^(.{2,40}?)\s{2,}(\d{1,5}[.,]\d{2})$/;
  for (const line of lines) {
    const match = line.match(lineItemRegex);
    if (match) {
      expenseLines.push({
        description: match[1].trim(),
        amount: parseFloat(match[2].replace(',', '')),
      });
    }
  }

  // --- Description (summary of all lines or first meaningful sentence) ---
  const description = expenseLines.length > 0
    ? expenseLines.map((l) => l.description).join(', ')
    : lines.slice(0, 5).join(' ').substring(0, 200);

  return { amount, currency, date, vendor, expenseType, description, expenseLines, rawText: text };
};

module.exports = { parseReceipt };
