const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    defaultCurrency: { type: String, default: 'USD' },
    country: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
