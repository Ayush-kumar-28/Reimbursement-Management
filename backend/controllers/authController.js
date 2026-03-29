const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const axios = require('axios');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Get default currency from country using restcountries API
const getCurrencyByCountry = async (country) => {
  try {
    const res = await axios.get(`https://restcountries.com/v3.1/name/${country}`);
    const currencies = res.data[0]?.currencies;
    if (currencies) return Object.keys(currencies)[0];
  } catch (_) {}
  return 'USD';
};

// POST /api/auth/signup
const signup = async (req, res) => {
  const { name, email, password, companyName, country } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const defaultCurrency = await getCurrencyByCountry(country || 'United States');
    const company = await Company.create({ name: companyName, country, defaultCurrency });

    const user = await User.create({ name, email, password, role: 'Admin', company: company._id });

    res.status(201).json({ token: generateToken(user._id), user: { id: user._id, name, email, role: user.role }, company });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('company');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email, role: user.role }, company: user.company });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { signup, login, getMe };
