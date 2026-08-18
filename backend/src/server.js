// backend/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth.routes');

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'AWS SES+SNS OTP'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Dutchkem Ventures Backend',
    version: '1.0.0',
    endpoints: ['/api/auth/request-otp', '/api/auth/verify-otp', '/health']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 OTP service: ${process.env.AWS_ACCESS_KEY_ID ? 'AWS configured (LIVE)' : 'Fallback mode (console only)'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});