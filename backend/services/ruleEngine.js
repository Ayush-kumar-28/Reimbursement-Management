/**
 * Rule Engine — handles sequential, parallel, and hybrid approval flows.
 */

/**
 * Build the initial approval chain from a rule when expense is submitted.
 * Sequential → only step 1 is Pending, rest are Waiting
 * Parallel   → all steps are Pending at once
 * Hybrid     → all steps are Pending at once (like parallel)
 */
const buildChainFromRule = (rule) => {
  const sorted = [...rule.steps].sort((a, b) => a.order - b.order);

  return sorted.map((step, i) => ({
    step: step.order,
    approverId: step.approverId._id || step.approverId,
    required: step.required,
    // sequential: only first is Pending, rest Waiting
    // parallel/hybrid: all Pending
    status: rule.type === 'sequential' && i > 0 ? 'Waiting' : 'Pending',
  }));
};

/**
 * After an approval in sequential mode, activate the next Waiting step.
 */
const activateNextStep = (expense) => {
  const next = expense.approvals
    .filter((a) => a.status === 'Waiting')
    .sort((a, b) => a.step - b.step)[0];
  if (next) next.status = 'Pending';
};

/**
 * Evaluate whether the expense should be Approved or Rejected.
 * Returns 'Approved', 'Rejected', or null (still in progress).
 */
const evaluateRule = (expense, rule) => {
  const approvals = expense.approvals;
  const total = approvals.length;
  const approvedCount = approvals.filter((a) => a.status === 'Approved').length;
  const rejectedCount = approvals.filter((a) => a.status === 'Rejected').length;
  const pendingOrWaiting = approvals.filter(
    (a) => a.status === 'Pending' || a.status === 'Waiting'
  ).length;

  // ── SEQUENTIAL ──────────────────────────────────────────
  if (rule.type === 'sequential') {
    // Any rejection → immediately rejected
    if (rejectedCount > 0) return 'Rejected';
    // All approved → done
    if (approvedCount === total) return 'Approved';
    return null; // still going
  }

  // ── PARALLEL ────────────────────────────────────────────
  if (rule.type === 'parallel') {
    const pct = (approvedCount / total) * 100;
    const maxPossible = ((approvedCount + pendingOrWaiting) / total) * 100;

    if (pct >= rule.minApprovalPercentage) return 'Approved';
    if (maxPossible < rule.minApprovalPercentage) return 'Rejected'; // can't reach threshold
    return null;
  }

  // ── HYBRID ──────────────────────────────────────────────
  if (rule.type === 'hybrid') {
    // Shortcut: if the special approver approved → instantly approved
    if (rule.autoApproveIf) {
      const special = approvals.find(
        (a) =>
          a.approverId.toString() === rule.autoApproveIf.toString() &&
          a.status === 'Approved'
      );
      if (special) return 'Approved';
    }

    const pct = (approvedCount / total) * 100;
    const maxPossible = ((approvedCount + pendingOrWaiting) / total) * 100;

    if (pct >= rule.minApprovalPercentage) return 'Approved';
    if (maxPossible < rule.minApprovalPercentage) return 'Rejected';
    return null;
  }

  return null;
};

module.exports = { buildChainFromRule, activateNextStep, evaluateRule };
