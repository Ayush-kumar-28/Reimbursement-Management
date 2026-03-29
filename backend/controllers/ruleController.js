const Rule = require('../models/Rule');

const populateRule = (q) =>
  q.populate('steps.approverId', 'name email role')
   .populate('appliesTo', 'name email')
   .populate('autoApproveIf', 'name email');

// GET /api/rules
const getRules = async (req, res) => {
  try {
    const rules = await populateRule(Rule.find({ company: req.user.company._id }));
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rules
const createRule = async (req, res) => {
  const { name, description, appliesTo, type, steps, minApprovalPercentage, autoApproveIf } = req.body;
  try {
    const rule = await Rule.create({
      company: req.user.company._id,
      name,
      description,
      appliesTo: appliesTo || null,
      type,
      steps: steps || [],
      minApprovalPercentage: minApprovalPercentage || 100,
      autoApproveIf: autoApproveIf || null,
    });
    const populated = await populateRule(Rule.findById(rule._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/rules/:id
const updateRule = async (req, res) => {
  try {
    const rule = await populateRule(
      Rule.findOneAndUpdate(
        { _id: req.params.id, company: req.user.company._id },
        req.body,
        { new: true }
      )
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/rules/:id
const deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findOneAndDelete({ _id: req.params.id, company: req.user.company._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getRules, createRule, updateRule, deleteRule };
