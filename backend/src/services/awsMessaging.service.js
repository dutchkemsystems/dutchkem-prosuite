// backend\src\services\awsMessaging.service.js
const AWS = require('aws-sdk');

class AWSMessagingService {
  constructor() {
    // Load credentials from environment
    this.awsConfig = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      fromEmail: process.env.AWS_SES_FROM_EMAIL || 'noreply@dutchkem.com'
    };
    
    this.otpStore = new Map();
    this.isConfigured = this.validateCredentials();
    
    if (this.isConfigured) {
      AWS.config.update({
        region: this.awsConfig.region,
        accessKeyId: this.awsConfig.accessKeyId,
        secretAccessKey: this.awsConfig.secretAccessKey
      });
      this.ses = new AWS.SES({ apiVersion: '2010-12-01' });
      this.sns = new AWS.SNS({ apiVersion: '2010-03-31' });
      console.log('✅ AWS Messaging Service initialized');
    } else {
      console.log('⚠️ AWS credentials missing - using fallback mode (console logging only)');
    }
  }

  validateCredentials() {
    return this.awsConfig.accessKeyId && 
           this.awsConfig.accessKeyId.startsWith('AKIA') &&
           this.awsConfig.secretAccessKey;
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTPEmail(email, otpCode, purpose = 'login') {
    if (!this.isConfigured) {
      console.log(`📧 [FALLBACK] OTP ${otpCode} would be sent to ${email}`);
      return { success: true, messageId: `fallback_${Date.now()}` };
    }

    try {
      const params = {
        Source: this.awsConfig.fromEmail,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: `Your ${purpose} code - Prosuite NG+` },
          Body: {
            Html: { 
              Data: `<div style="font-family: Arial; padding: 20px;">
                      <h2>Your verification code</h2>
                      <h1 style="font-size: 48px; letter-spacing: 8px;">${otpCode}</h1>
                      <p>Valid for 10 minutes.</p>
                     </div>` 
            },
            Text: { Data: `Your verification code is: ${otpCode}. Valid for 10 minutes.` }
          }
        }
      };
      const result = await this.ses.sendEmail(params).promise();
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('SES Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendOTPSMS(phoneNumber, otpCode) {
    if (!this.isConfigured) {
      console.log(`📱 [FALLBACK] SMS OTP ${otpCode} would be sent to ${phoneNumber}`);
      return { success: true, messageId: `fallback_${Date.now()}` };
    }

    try {
      let cleaned = phoneNumber.replace(/\D/g, '');
      if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
      if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
      
      const params = {
        Message: `Your Prosuite NG+ code: ${otpCode}. Valid 10 min.`,
        PhoneNumber: `+${cleaned}`,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'ProsuiteNG' },
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
        }
      };
      const result = await this.sns.publish(params).promise();
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('SNS Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendOTP(identifier, purpose = 'login') {
    const isEmail = identifier.includes('@') && identifier.includes('.');
    const otpCode = this.generateOTP();
    
    // Store OTP
    const key = `${identifier}_${purpose}`;
    this.otpStore.set(key, { 
      code: otpCode, 
      expiresAt: Date.now() + 10 * 60 * 1000, 
      attempts: 0 
    });
    setTimeout(() => this.otpStore.delete(key), 10 * 60 * 1000);
    
    let result;
    if (isEmail) {
      result = await this.sendOTPEmail(identifier, otpCode, purpose);
    } else {
      result = await this.sendOTPSMS(identifier, otpCode);
    }
    
    return {
      success: result.success,
      message: `OTP sent via ${isEmail ? 'email' : 'SMS'}`,
      expiresIn: '10 minutes',
      ...(process.env.NODE_ENV === 'development' && { debug_otp: otpCode })
    };
  }

  async verifyOTP(identifier, otpCode, purpose = 'login') {
    const key = `${identifier}_${purpose}`;
    const record = this.otpStore.get(key);
    
    if (!record) return { success: false, error: 'OTP expired or not found' };
    if (record.attempts >= 5) return { success: false, error: 'Too many attempts' };
    if (record.code !== otpCode) {
      record.attempts++;
      this.otpStore.set(key, record);
      return { success: false, error: 'Invalid OTP code' };
    }
    
    this.otpStore.delete(key);
    return { success: true };
  }

  async resendOTP(identifier, purpose = 'login') {
    return await this.sendOTP(identifier, purpose);
  }

  getStatus() {
    return {
      mode: this.isConfigured ? 'LIVE (AWS)' : 'FALLBACK (console)',
      region: this.awsConfig.region,
      fromEmail: this.awsConfig.fromEmail
    };
  }
}

module.exports = new AWSMessagingService();