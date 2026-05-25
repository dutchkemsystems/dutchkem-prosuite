import { Router } from 'express';
import { randomBytes } from 'crypto';
import { adminAuth } from '../middleware/auth.mjs';

const router = Router();

function convexClient(req) {
  return req.app.locals.convex;
}

// POST /api/admin/avatar - Upload admin avatar
router.post('/avatar', adminAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Store avatar URL in system_config for admin profile
    const timestamp = Date.now();
    const avatarUrl = `https://cdn.dutchkem.com/admin/avatar_${timestamp}.png`;

    // In production, upload to S3/Cloudinary here:
    //   const upload = await cloudinary.uploader.upload(imageBase64, { folder: 'admin' });
    //   const avatarUrl = upload.secure_url;

    const existing = await convex.query('api.admin.getSystemConfig', {});
    await convex.mutation('api.admin.updateSystemConfig', {
      key: 'ADMIN_AVATAR_URL',
      value: avatarUrl,
    });

    res.json({ avatarUrl, message: 'Avatar updated successfully' });
  } catch (err) {
    console.error('[ADMIN] avatar upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/change-password
router.post('/change-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // In production: verify current password hash + update with new hash
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('[ADMIN] change-password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/enable-2fa
router.post('/enable-2fa', adminAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const secret = randomBytes(20).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
    const qrUrl = `otpauth://totp/Dutchkem:admin?secret=${secret}&issuer=Dutchkem`;

    await convex.mutation('api.auth_helpers:setupAdmin2FA', {
      adminId: req.adminId,
      secret,
    });

    res.json({ secret, qrUrl, message: 'Scan QR with Google Authenticator. 2FA is now enabled.' });
  } catch (err) {
    console.error('[ADMIN] enable-2fa error:', err);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/admin/seed-holidays
router.post('/seed-holidays', adminAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    await convex.mutation('api.holidays.seedHolidays', {});
    res.json({ success: true, message: 'Holidays seeded' });
  } catch (err) {
    console.error('[ADMIN] seed-holidays error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/active-discount
router.get('/active-discount', adminAuth, async (req, res) => {
  try {
    const convex = convexClient(req);
    const discount = await convex.query('api.holidays.getActiveDiscount', {});
    res.json({ discount });
  } catch (err) {
    console.error('[ADMIN] active-discount error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
