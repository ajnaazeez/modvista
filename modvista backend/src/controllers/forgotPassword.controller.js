const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const sendEmail = require('../utils/sendEmail');
const asyncHandler = require('../utils/asyncHandler');

// ─── helpers ────────────────────────────────────────────────────────────────
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// ─── 1. POST /api/auth/forgot-password/request-otp ──────────────────────────
const requestOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ ok: false, message: 'Email is required.' });
    }

    // Verify role if specified (for admin portal)
    const { role } = req.query; // or use a different parameter if you prefer

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (role === 'admin' && user && user.role !== 'admin' && !user.isAdmin) {
        return res.status(200).json({
            ok: true,
            message: 'If this email is registered as an admin, an OTP has been sent.',
            resetSessionId: crypto.randomUUID(),
        });
    }

    // Silently succeed if user not found or has no phone
    if (!user || !user.phone) {
        return res.status(200).json({
            ok: true,
            message: 'If this email is registered, an OTP has been sent to the linked phone number.',
            resetSessionId: crypto.randomUUID(), // dummy id so frontend flow is identical
        });
    }

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const sessionId = crypto.randomUUID();

    // Store hashed OTP + session
    user.resetSessionId = sessionId;
    user.resetOtpHash = sha256(otp);
    user.resetOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    user.resetOtpAttempts = 0;
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();

    // Send OTP via Email
    try {
        await sendEmail({
            to: user.email,
            subject: 'ModVista — Your Password Reset OTP',
            text: `Your ModVista password reset OTP is: ${otp}\nIt expires in 5 minutes. Do not share it with anyone.`,
            html: `
                <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
                    <div style="background:#e31c1c;padding:28px 32px;">
                        <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:2px;">Mod<span style="color:#fff;font-weight:300;">Vista</span></h1>
                    </div>
                    <div style="padding:32px;">
                        <h2 style="color:#fff;margin:0 0 8px;">Password Reset OTP</h2>
                        <p style="color:#aaa;margin:0 0 28px;font-size:14px;">Use the code below to reset your password. It expires in <strong style="color:#fff;">5 minutes</strong>.</p>
                        <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                            <span style="font-size:42px;font-weight:700;letter-spacing:12px;color:#e31c1c;">${otp}</span>
                        </div>
                        <p style="color:#666;font-size:12px;margin:0;">If you did not request this, you can safely ignore this email. Do not share this OTP with anyone.</p>
                    </div>
                </div>
            `,
        });
        console.log(`[ForgotPassword] OTP email sent to ${user.email}`);
    } catch (emailErr) {
        console.error('[ForgotPassword] Email send failed:', emailErr.message);
    }

    return res.status(200).json({
        ok: true,
        message: 'If this email is registered, an OTP has been sent to the linked phone number.',
        resetSessionId: sessionId,
    });
});

// ─── 2. POST /api/auth/forgot-password/verify-otp ───────────────────────────
const verifyOtp = asyncHandler(async (req, res) => {
    const { email, resetSessionId, otp } = req.body;

    if (!email || !resetSessionId || !otp) {
        return res.status(400).json({ ok: false, message: 'email, resetSessionId and otp are required.' });
    }

    const user = await User.findOne({
        email: email.toLowerCase().trim(),
        resetSessionId,
    });

    if (!user || !user.resetOtpHash) {
        return res.status(400).json({ ok: false, message: 'Invalid or expired OTP session.' });
    }

    // Rate-limit: max 3 attempts
    if (user.resetOtpAttempts >= 3) {
        return res.status(429).json({ ok: false, message: 'Too many attempts. Please request a new OTP.' });
    }

    // Increment attempt count first
    user.resetOtpAttempts += 1;
    await user.save();

    // Check expiry
    if (!user.resetOtpExpires || user.resetOtpExpires < new Date()) {
        return res.status(400).json({ ok: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP hash
    if (sha256(String(otp)) !== user.resetOtpHash) {
        const remaining = 3 - user.resetOtpAttempts;
        return res.status(400).json({
            ok: false,
            message: `Incorrect OTP.${remaining > 0 ? ` ${remaining} attempt(s) remaining.` : ' No attempts remaining. Request a new OTP.'}`,
        });
    }

    // OTP valid — clear OTP fields and issue a short-lived resetToken
    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetOtpHash = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    user.resetSessionId = null;
    user.resetTokenHash = sha256(resetToken);
    user.resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    return res.status(200).json({
        ok: true,
        message: 'OTP verified successfully.',
        resetToken,
    });
});

// ─── 3. POST /api/auth/forgot-password/reset ────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
        return res.status(400).json({ ok: false, message: 'email, resetToken and newPassword are required.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters long.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.resetTokenHash) {
        return res.status(400).json({ ok: false, message: 'Invalid or expired reset token.' });
    }

    // Verify token hash
    if (sha256(resetToken) !== user.resetTokenHash) {
        return res.status(400).json({ ok: false, message: 'Invalid reset token.' });
    }

    // Check expiry
    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
        return res.status(400).json({ ok: false, message: 'Reset token has expired. Please start over.' });
    }

    // Hash the new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Invalidate the token
    user.resetTokenHash = null;
    user.resetTokenExpires = null;

    await user.save();

    return res.status(200).json({
        ok: true,
        message: 'Password reset successful. You can now log in with your new password.',
    });
});

module.exports = { requestOtp, verifyOtp, resetPassword };
