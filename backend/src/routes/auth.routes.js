// backend\src\routes\auth.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const awsMessaging = require('../services/awsMessaging.service');

// Mock user database (replace with your actual DB)
const users = new Map();

function generateToken(user) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
  }
  return jwt.sign(
    { id: user.id, email: user.email, phone: user.phone, role: user.role },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

// Request OTP
router.post('/request-otp', async (req, res) => {
  try {
    const { identifier, purpose = 'login' } = req.body;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone number required' });
    }
    
    const result = await awsMessaging.sendOTP(identifier, purpose);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send OTP' });
    }
    
    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
      ...(process.env.NODE_ENV === 'development' && { debug_otp: result.debug_otp })
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { identifier, otpCode, purpose = 'login' } = req.body;
    
    if (!identifier || !otpCode) {
      return res.status(400).json({ error: 'Identifier and OTP code required' });
    }
    
    const verification = await awsMessaging.verifyOTP(identifier, otpCode, purpose);
    
    if (!verification.success) {
      return res.status(401).json({ error: verification.error });
    }
    
    // Find or create user
    let user = users.get(identifier);
    if (!user) {
      const isEmail = identifier.includes('@');
      user = {
        id: Date.now().toString(),
        [isEmail ? 'email' : 'phone']: identifier,
        name: isEmail ? identifier.split('@')[0] : identifier,
        role: 'client',
        createdAt: new Date()
      };
      users.set(identifier, user);
    }
    
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { identifier, purpose = 'login' } = req.body;
    
    const result = await awsMessaging.resendOTP(identifier, purpose);
    
    if (!result.success) {
      return res.status(429).json({ error: result.error || 'Too many requests' });
    }
    
    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service status
router.get('/status', (req, res) => {
  res.json(awsMessaging.getStatus());
});

module.exports = router;