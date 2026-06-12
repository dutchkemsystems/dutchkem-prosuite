const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// OTP store
const otpStore = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Request OTP
app.post('/api/auth/request-otp', (req, res) => {
  try {
    console.log('Request received:', req.body);
    
    const { identifier, purpose = 'login' } = req.body;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Email or phone required' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const isEmail = identifier.includes('@');
    
    // Log OTP
    console.log(`\n🔐 OTP for ${identifier}: ${otp}`);
    
    // Store OTP
    const key = `${identifier}_${purpose}`;
    otpStore.set(key, {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });
    
    // Auto cleanup
    setTimeout(() => otpStore.delete(key), 10 * 60 * 1000);
    
    // Check if AWS is configured
    const awsConfigured = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'MOCK_KEY';
    
    res.json({
      success: true,
      message: `OTP sent via ${isEmail ? 'email' : 'SMS'}`,
      expiresIn: '10 minutes',
      mode: awsConfigured ? 'aws' : 'fallback',
      debug_otp: otp  // Always show for testing
    });
    
  } catch (error) {
    console.error('Error in request-otp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { identifier, otpCode, purpose = 'login' } = req.body;
    
    const key = `${identifier}_${purpose}`;
    const record = otpStore.get(key);
    
    if (!record) {
      return res.status(401).json({ error: 'OTP expired or not found' });
    }
    
    if (record.attempts >= 5) {
      return res.status(401).json({ error: 'Too many attempts' });
    }
    
    if (record.code !== otpCode) {
      record.attempts++;
      otpStore.set(key, record);
      return res.status(401).json({ error: 'Invalid OTP code' });
    }
    
    otpStore.delete(key);
    
    const token = jwt.sign(
      { identifier, purpose },
      process.env.JWT_SECRET || 'dutchkem-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: Buffer.from(identifier).toString('base64').substring(0, 20),
        name: identifier.includes('@') ? identifier.split('@')[0] : identifier,
        email: identifier.includes('@') ? identifier : null,
        phone: !identifier.includes('@') ? identifier : null
      }
    });
    
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status endpoint
app.get('/api/auth/status', (req, res) => {
  const awsConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'MOCK_KEY');
  res.json({
    mode: awsConfigured ? 'LIVE (AWS)' : 'FALLBACK (Console)',
    awsConfigured: awsConfigured,
    region: process.env.AWS_REGION || 'us-east-1',
    fromEmail: process.env.AWS_SES_FROM_EMAIL || 'not set',
    otpCount: otpStore.size
  });
});

app.listen(PORT, () => {
  const awsConfigured = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'MOCK_KEY';
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║     Dutchkem Ventures - OTP Server Started                    ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`📧 OTP Mode: ${awsConfigured ? 'LIVE (AWS)' : 'FALLBACK (Console Logging)'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/auth/status`);
  console.log(`\n✨ Ready to receive OTP requests!\n`);
});