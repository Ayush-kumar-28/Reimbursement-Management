const router = require('express').Router();
const { getRules, createRule, updateRule, deleteRule } = require('../controllers/ruleController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('Admin'));

router.get('/', getRules);
router.post('/', createRule);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);

module.exports = router;
