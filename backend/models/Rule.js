const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  required: { type: Boolean, default: false }, // for hybrid: this person = auto-approve if they approve
});

const ruleSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    description: { type: String },
    appliesTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = all employees
    type: {
      type: String,
      enum: ['sequential', 'parallel', 'hybrid'],
      required: true,
    },
    steps: [stepSchema], // ordered list of approvers
    minApprovalPercentage: { type: Number, default: 100 }, // for parallel/hybrid
    autoApproveIf: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // hybrid: if this person approves → done
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rule', ruleSchema);
