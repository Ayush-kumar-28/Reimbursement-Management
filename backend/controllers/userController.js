const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/users — Admin: all users in company
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ company: req.user.company._id }).select('-password').populate('manager', 'name email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/users — Admin creates employee/manager
const createUser = async (req, res) => {
  const { name, email, password, role, managerId } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Employee',
      company: req.user.company._id,
      manager: managerId || null,
    });

    const populated = await User.findById(user._id).select('-password').populate('manager', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:id — Admin updates user
const updateUser = async (req, res) => {
  try {
    const { name, role, managerId } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company._id },
      { name, role, manager: managerId || null },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id — Admin deletes user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, company: req.user.company._id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
