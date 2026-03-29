const Company = require('../models/Company');

// GET /api/company
const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company._id);
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/company
const updateCompany = async (req, res) => {
  const { name, defaultCurrency } = req.body;
  try {
    const company = await Company.findByIdAndUpdate(
      req.user.company._id,
      { name, defaultCurrency },
      { new: true }
    );
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCompany, updateCompany };
