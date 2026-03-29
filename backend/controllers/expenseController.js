const Expense = require('../models/Expense');
const User = require('../models/User');
const Rule = require('../models/Rule');
const { convertCurrency } = require('../services/currencyService');
const { buildChainFromRule, activateNextStep, evaluateRule } = require('../services/ruleEngine');

// ── Find the best matching rule for an employee ──────────────
const findRule = async (employeeId, companyId) => {
  // Specific rule for this employee first
  let rule = await Rule.findOne({ company: companyId, appliesTo: employeeId, active: true })
    .populate('steps.approverId', 'name email role')
    .populate('autoApproveIf', 'name');

  // Fallback: global rule
  if (!rule) {
    rule = await Rule.findOne({ company: companyId, appliesTo: null, active: true })
      .populate('steps.approverId', 'name email role')
      .populate('autoApproveIf', 'name');
  }
  return rule;
};

// ── Fallback chain when no rule exists ───────────────────────
// Sequential: Manager → Finance → Director → Admin
const buildFallbackChain = async (employee) => {
  const chain = [];
  let step = 1;

  if (employee.manager) {
    chain.push({ step: step++, approverId: employee.manager, required: false, status: 'Pending' });
  }

  const financeUsers = await User.find({ company: employee.company, role: 'Finance' });
  financeUsers.forEach((u) =>
    chain.push({ step: step++, approverId: u._id, required: false, status: chain.length === 0 ? 'Pending' : 'Waiting' })
  );

  const directors = await User.find({ company: employee.company, role: 'Director' });
  directors.forEach((u) =>
    chain.push({ step: step++, approverId: u._id, required: false, status: chain.length === 0 ? 'Pending' : 'Waiting' })
  );

  if (chain.length === 0) {
    const admin = await User.findOne({ company: employee.company, role: 'Admin' });
    if (admin) chain.push({ step: 1, approverId: admin._id, required: false, status: 'Pending' });
  }

  return chain;
};

// ── POST /api/expenses/draft ──────────────────────────────────
const saveDraft = async (req, res) => {
  const { amount, currency, category, description, date, ocrData, draftId } = req.body;
  try {
    const employee = await User.findById(req.user._id).populate('company');

    let parsedOcrData = null;
    if (ocrData) {
      try { parsedOcrData = typeof ocrData === 'string' ? JSON.parse(ocrData) : ocrData; } catch (_) {}
    }

    const fields = {
      employee: employee._id,
      company: employee.company._id,
      amount: amount || 0,
      currency: currency || employee.company.defaultCurrency,
      category: category || '',
      description: description || '',
      date: date || null,
      receiptUrl: req.file ? req.file.path : (req.body.receiptPath || null),
      ocrData: parsedOcrData,
      status: 'Draft',
      approvals: [],
    };

    let expense;
    if (draftId) {
      // Update existing draft
      expense = await Expense.findOneAndUpdate(
        { _id: draftId, employee: employee._id, status: 'Draft' },
        fields,
        { new: true }
      );
    } else {
      expense = await Expense.create(fields);
    }

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/expenses/:id/submit ─────────────────────────────
// Submit a saved draft into the approval workflow
const submitDraft = async (req, res) => {
  try {
    const employee = await User.findById(req.user._id).populate('company');
    const expense = await Expense.findOne({ _id: req.params.id, employee: employee._id, status: 'Draft' });
    if (!expense) return res.status(404).json({ message: 'Draft not found' });

    const companyCurrency = employee.company.defaultCurrency;
    const convertedAmount = await convertCurrency(expense.amount, expense.currency, companyCurrency);

    const rule = await findRule(employee._id, employee.company._id);
    let approvals, ruleId = null;
    if (rule) {
      approvals = buildChainFromRule(rule);
      ruleId = rule._id;
    } else {
      approvals = await buildFallbackChain(employee);
    }

    expense.convertedAmount = convertedAmount;
    expense.convertedCurrency = companyCurrency;
    expense.approvals = approvals;
    expense.ruleId = ruleId;
    expense.status = 'Pending';
    expense.currentStep = 1;
    await expense.save();

    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/expenses/:id (draft only) ─────────────────────
const deleteDraft = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      employee: req.user._id,
      status: 'Draft',
    });
    if (!expense) return res.status(404).json({ message: 'Draft not found' });
    res.json({ message: 'Draft deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const submitExpense = async (req, res) => {
  const { amount, currency, category, description, date, ocrData } = req.body;
  try {
    const employee = await User.findById(req.user._id).populate('company');
    const companyCurrency = employee.company.defaultCurrency;
    const convertedAmount = await convertCurrency(amount, currency, companyCurrency);

    const rule = await findRule(employee._id, employee.company._id);
    let approvals, ruleId = null;

    if (rule) {
      approvals = buildChainFromRule(rule);
      ruleId = rule._id;
    } else {
      approvals = await buildFallbackChain(employee);
    }

    let parsedOcrData = null;
    if (ocrData) {
      try { parsedOcrData = typeof ocrData === 'string' ? JSON.parse(ocrData) : ocrData; } catch (_) {}
    }

    const expense = await Expense.create({
      employee: employee._id,
      company: employee.company._id,
      amount,
      currency,
      convertedAmount,
      convertedCurrency: companyCurrency,
      category,
      description,
      date,
      receiptUrl: req.file ? req.file.path : (req.body.receiptPath || null),
      ocrData: parsedOcrData,
      approvals,
      ruleId,
      currentStep: 1,
    });

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/expenses ─────────────────────────────────────────
const getExpenses = async (req, res) => {
  try {
    let query = { company: req.user.company._id };
    if (req.user.role === 'Employee') {
      query.employee = req.user._id;
    } else if (['Manager', 'Finance', 'Director'].includes(req.user.role)) {
      query['approvals.approverId'] = req.user._id;
    }
    // Admin sees all

    const expenses = await Expense.find(query)
      .populate('employee', 'name email')
      .populate('approvals.approverId', 'name email role')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/expenses/:id ─────────────────────────────────────
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, company: req.user.company._id })
      .populate('employee', 'name email')
      .populate('approvals.approverId', 'name email role');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/expenses/:id/approve ─────────────────────────────
const approveExpense = async (req, res) => {
  const { action, comment } = req.body; // action: 'Approved' | 'Rejected'
  try {
    const expense = await Expense.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status !== 'Pending') return res.status(400).json({ message: 'Expense already resolved' });

    // Find this approver's pending step
    const step = expense.approvals.find(
      (a) => a.approverId.toString() === req.user._id.toString() && a.status === 'Pending'
    );
    if (!step) return res.status(403).json({ message: 'Not your turn or already acted' });

    step.status = action;
    step.comment = comment || '';
    step.actionAt = new Date();

    // Sequential: activate next step on approval
    if (action === 'Approved' && expense.ruleId) {
      const rule = await Rule.findById(expense.ruleId);
      if (rule?.type === 'sequential') activateNextStep(expense);
    } else if (action === 'Approved' && !expense.ruleId) {
      // Fallback is always sequential
      activateNextStep(expense);
    }

    // Evaluate result
    let result = null;
    if (expense.ruleId) {
      const rule = await Rule.findById(expense.ruleId);
      if (rule) result = evaluateRule(expense, rule);
    } else {
      // Fallback sequential logic
      if (action === 'Rejected') {
        result = 'Rejected';
      } else {
        const allDone = expense.approvals.every(
          (a) => a.status === 'Approved' || a.status === 'Rejected'
        );
        if (allDone) result = 'Approved';
      }
    }

    if (result) expense.status = result;
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/expenses/:id/override (Admin) ────────────────────
const overrideExpense = async (req, res) => {
  const { status } = req.body;
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      { status },
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { saveDraft, submitDraft, deleteDraft, submitExpense, getExpenses, getExpenseById, approveExpense, overrideExpense };
