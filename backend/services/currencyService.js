const axios = require('axios');

/**
 * Convert amount from one currency to another.
 * Uses exchangerate-api.com (free tier).
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  try {
    const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/${toCurrency}/${amount}`;
    const res = await axios.get(url);
    return res.data.conversion_result;
  } catch (err) {
    console.error('Currency conversion failed:', err.message);
    return amount; // fallback: return original amount
  }
};

module.exports = { convertCurrency };
