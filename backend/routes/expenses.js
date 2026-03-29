const router = require('express').Router();
const {
  saveDraft,
  submitDraft,
  deleteDraft,
  submitExpense,
  getExpenses,
  getExpenseById,
  approveExpense,
  overrideExpense,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.post('/', authorize('Employee'), upload.single('receipt'), submitExpense);
router.post('/draft', authorize('Employee'), upload.single('receipt'), saveDraft);
router.post('/:id/submit', authorize('Employee'), submitDraft);
router.delete('/:id', authorize('Employee'), deleteDraft);
router.put('/:id/approve', authorize('Manager', 'Finance', 'Director'), approveExpense);
router.put('/:id/override', authorize('Admin'), overrideExpense);

module.exports = router;
