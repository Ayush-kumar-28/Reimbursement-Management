const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
});

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    // Log to console always (useful for dev)
    console.log(`\n🔑 PASSWORD RESET LINK for ${user.email}:\n${resetUrl}\n`);

    // Send email only if credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"Expense Reimbursement" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Password Reset Request',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
              <h2>Reset Your Password</h2>
              <p>Hi ${user.name},</p>
              <p>You requested a password reset. Click the button below to set a new password.</p>
              <a href="${resetUrl}" style="display:inline-block;padding:0.7rem 1.5rem;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
                Reset Password
              </a>
              <p style="margin-top:1rem;color:#6b7280;font-size:0.85rem;">
                This link expires in 1 hour. If you didn't request this, ignore this email.
              </p>
            </div>
          `,
        });
        console.log(`✅ Email sent to ${user.email}`);
      } catch (emailErr) {
        console.error('❌ Email send failed:', emailErr.message);
      }
    } else {
      console.log('⚠️  EMAIL_USER or EMAIL_PASS not set in .env — skipping email send');
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    user.password = password; // pre-save hook will hash it
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { forgotPassword, resetPassword };
