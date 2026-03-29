const router = require('express').Router();
const { getCompany, updateCompany } = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getCompany);
router.put('/', authorize('Admin'), updateCompany);

module.exports = router;
