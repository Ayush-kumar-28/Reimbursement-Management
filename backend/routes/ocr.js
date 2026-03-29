const router = require('express').Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseReceipt } = require('../services/ocrService');

// POST /api/ocr/scan — upload receipt, get back parsed fields
router.post('/scan', protect, upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const result = await parseReceipt(req.file.path);
    res.json({ ...result, receiptPath: req.file.path });
  } catch (err) {
    res.status(500).json({ message: 'OCR processing failed', error: err.message });
  }
});

module.exports = router;
