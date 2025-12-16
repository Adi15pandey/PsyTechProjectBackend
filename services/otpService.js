const OTP = require('../models/OTP');
const axios = require('axios');

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH) || 6;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'PSYTCH';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

class OTPService {
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendOTP(phoneNumber, otpCode) {
    if (MSG91_AUTH_KEY) {
      console.log(`Attempting to send OTP via MSG91 to ${phoneNumber}`);
      return this.sendViaMSG91(phoneNumber, otpCode);
    }

    console.log(`OTP for ${phoneNumber}: ${otpCode}`);
    console.log(`Valid for ${OTP_EXPIRY_MINUTES} minutes`);
    console.log(`SMS service not configured. OTP logged above.`);
    console.log(`To enable real SMS: Add MSG91_AUTH_KEY in Render environment variables`);
    
    return { success: true, message: 'OTP sent (check logs for OTP code)' };
  }

  static async sendViaMSG91(phoneNumber, otpCode) {
    try {
      if (!MSG91_TEMPLATE_ID) {
        throw new Error('MSG91 template ID not configured');
      }

      const url = 'https://control.msg91.com/api/v5/flow/';
      const normalizedPhone = phoneNumber.replace(/^\+/, '');
      
      const payload = {
        template_id: MSG91_TEMPLATE_ID,
        sender: MSG91_SENDER_ID,
        short_url: '0',
        mobiles: normalizedPhone,
        otp: otpCode
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'authkey': MSG91_AUTH_KEY
        },
        timeout: 10000
      });

      if (response.data && response.data.type === 'success') {
        return { success: true, message: 'OTP sent successfully' };
      } else {
        throw new Error(response.data?.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('MSG91 Error:', error.response?.data || error.message);
      console.log(`OTP for ${phoneNumber}: ${otpCode}`);
      return { success: true, message: 'OTP sent (fallback mode)' };
    }
  }

  static async storeOTP(phoneNumber, otpCode) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await OTP.create(phoneNumber, otpCode, expiresAt);
  }

  static async verifyOTP(phoneNumber, otpCode) {
    if (!phoneNumber || !otpCode) {
      return { valid: false, error: 'Phone number and OTP are required' };
    }

    const normalizedPhone = String(phoneNumber).trim();
    const normalizedOTP = String(otpCode).trim();

    const otpRecord = await OTP.findByPhoneAndCode(normalizedPhone, normalizedOTP);
    
    if (!otpRecord) {
      return { valid: false, error: 'Invalid or expired OTP' };
    }

    await OTP.delete(normalizedPhone, normalizedOTP);
    
    return { valid: true };
  }

  static async checkRateLimit(phoneNumber) {
    const count = await OTP.countByPhoneNumber(phoneNumber, 60);
    return count < 3;
  }
}

module.exports = OTPService;

