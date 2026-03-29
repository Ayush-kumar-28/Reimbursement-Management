const Tesseract = require('tesseract.js');

/**
 * Extracts structured expense data from a receipt image using Tesseract OCR.
 */
const parseReceipt = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: () => {}, // suppress progress logs
    });
    return extractFields(text);
  } catch (err) {
    console.error('Tesseract error:', err.message);
    throw err;
  }
};

const extractFields = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  // --- Amount ---
  const amountMatch =
    text.match(/(?:total|amount|grand total|subtotal)[^\d]*(\d{1,6}[.,]\d{2})/i) ||
    text.match(/\$\s*(\d{1,6}[.,]\d{2})/) ||
    text.match(/(\d{1,6}[.,]\d{2})\s*(?:USD|INR|EUR|GBP)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  // --- Currency ---
  const currencyMatch = text.match(/\b(USD|INR|EUR|GBP|AED|SGD|CAD|AUD|JPY|CNY)\b/i);
  let currency = null;
  if (currencyMatch) {
    currency = currencyMatch[1].toUpperCase();
  } else if (text.includes('$')) {
    currency = 'USD';
  } else if (text.includes('₹')) {
    currency = 'INR';
  } else if (text.includes('€')) {
    currency = 'EUR';
  } else if (text.includes('£')) {
    currency = 'GBP';
  }

  // --- Date ---
  const dateMatch =
    text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/) ||
    text.match(/\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/) ||
    text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i);
  let date = null;
  if (dateMatch) {
    const parsed = new Date(dateMatch[0]);
    if (!isNaN(parsed)) date = parsed.toISOString().split('T')[0];
  }

  // --- Vendor ---
  const vendor = lines.slice(0, 3).find((l) => l.length > 2 && !/^\d/.test(l)) || null;

  // --- Expense Type ---
  const typeMap = {
    Meals: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'pizza', 'burger', 'bar', 'bistro', 'bakery'],
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

  // --- Expense Lines ---
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

  // --- Description ---
  const description = expenseLines.length > 0
    ? expenseLines.map((l) => l.description).join(', ')
    : lines.slice(0, 5).join(' ').substring(0, 200);

  return { amount, currency, date, vendor, expenseType, description, expenseLines, rawText: text };
};

module.exports = { parseReceipt };
