const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema({
  step: { type: Number, required: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  required: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Waiting'], default: 'Pending' },
  comment: { type: String, default: '' },
  actionAt: { type: Date },
});

const expenseSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    convertedAmount: { type: Number }, // in company default currency
    convertedCurrency: { type: String },
    category: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    receiptUrl: { type: String }, // uploaded receipt image path
    ocrData: {
      vendor: String,
      amount: Number,
      date: String,
      expenseType: String,
      description: String,
      expenseLines: [{ description: String, quantity: Number, unitPrice: Number, amount: Number }],
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    currentStep: { type: Number, default: 1 },
    approvals: [approvalStepSchema],
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
