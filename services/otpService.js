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
    // If MSG91 is configured, use it
    if (MSG91_AUTH_KEY) {
      return this.sendViaMSG91(phoneNumber, otpCode);
    }

    // Otherwise, log it (for development/testing)
    console.log(`📱 OTP for ${phoneNumber}: ${otpCode}`);
    return { success: true, message: 'OTP sent (logged to console)' };
  }

  static async sendViaMSG91(phoneNumber, otpCode) {
    try {
      const url = 'https://control.msg91.com/api/v5/flow/';
      const payload = {
        template_id: MSG91_TEMPLATE_ID,
        sender: MSG91_SENDER_ID,
        short_url: '0',
        mobiles: phoneNumber.replace('+', ''),
        otp: otpCode
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'authkey': MSG91_AUTH_KEY
        }
      });

      if (response.data.type === 'success') {
        return { success: true, message: 'OTP sent successfully' };
      } else {
        throw new Error(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('MSG91 Error:', error.response?.data || error.message);
      // Fallback to console log in case of error
      console.log(`📱 OTP for ${phoneNumber}: ${otpCode}`);
      return { success: true, message: 'OTP sent (fallback mode)' };
    }
  }

  static async storeOTP(phoneNumber, otpCode) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await OTP.create(phoneNumber, otpCode, expiresAt);
  }

  static async verifyOTP(phoneNumber, otpCode) {
    const otpRecord = await OTP.findByPhoneAndCode(phoneNumber, otpCode);
    
    if (!otpRecord) {
      return { valid: false, error: 'Invalid or expired OTP' };
    }

    // Delete the OTP after successful verification
    await OTP.delete(phoneNumber, otpCode);
    
    return { valid: true };
  }

  static async checkRateLimit(phoneNumber) {
    const count = await OTP.countByPhoneNumber(phoneNumber, 60);
    return count < 3; // Max 3 OTPs per hour
  }
}

module.exports = OTPService;

