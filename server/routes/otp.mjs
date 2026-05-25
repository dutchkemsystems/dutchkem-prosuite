import { Router } from 'express';
import { rateLimitMiddleware } from '../middleware/auth.mjs';

const router = Router();

function convex(req) { return req.app.locals.convex; }

const otpRateLimit = rateLimitMiddleware(5, 60 * 1000);

// POST /api/otp/send
router.post('/send', otpRateLimit, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const result = await convex(req).mutation('api.auth.sendOTP', { phone });
    res.json({ success: true, message: 'OTP sent', ...(result || {}) });
  } catch (err) {
    console.error('[OTP] send error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/otp/verify
router.post('/verify', otpRateLimit, async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

    const result = await convex(req).mutation('api.auth.verifyOTP', { phone, code });
    if (!result?.success) return res.status(401).json({ error: 'Invalid or expired OTP' });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[OTP] verify error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

export default router;
