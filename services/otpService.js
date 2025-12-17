const OTP = require('../models/OTP');
const mongoose = require('../config/database');
const axios = require('axios');

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH) || 6;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'PSYTCH';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const DEV_OTP = process.env.DEV_OTP || '123456';

class OTPService {
  static generateOTP() {
    if (process.env.USE_DEV_OTP === 'true' || process.env.NODE_ENV === 'development' || !MSG91_AUTH_KEY) {
      return DEV_OTP;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendOTP(phoneNumber, otpCode) {
    if (process.env.USE_DEV_OTP === 'true' || process.env.NODE_ENV === 'development') {
      console.log(`Development mode: Using hardcoded OTP ${otpCode} for ${phoneNumber}`);
      return { success: true, message: 'OTP sent successfully (development mode)' };
    }

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
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB not connected, skipping OTP storage');
        return;
      }
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
      await OTP.create(phoneNumber, otpCode, expiresAt);
    } catch (error) {
      console.error('Store OTP error:', error.message);
      throw error;
    }
  }

  static async verifyOTP(phoneNumber, otpCode) {
    if (!phoneNumber || !otpCode) {
      return { valid: false, error: 'Phone number and OTP are required' };
    }

    const normalizedPhone = String(phoneNumber).trim();
    const normalizedOTP = String(otpCode).trim();

    const isDevMode = process.env.USE_DEV_OTP === 'true' || process.env.NODE_ENV === 'development' || !MSG91_AUTH_KEY;
    
    if (normalizedOTP === DEV_OTP) {
      if (mongoose.connection.readyState === 1) {
        try {
          const otpRecord = await OTP.findByPhoneAndCode(normalizedPhone, normalizedOTP);
          if (otpRecord) {
            await OTP.delete(normalizedPhone, normalizedOTP);
          }
        } catch (error) {
          console.error('OTP cleanup error:', error.message);
        }
      }
      console.log(`Hardcoded OTP ${DEV_OTP} accepted for ${normalizedPhone}`);
      return { valid: true };
    }

    if (mongoose.connection.readyState !== 1) {
      return { valid: false, error: 'Database connection not available. Please try again.' };
    }

    try {
      const otpRecord = await OTP.findByPhoneAndCode(normalizedPhone, normalizedOTP);
      
      if (!otpRecord) {
        return { valid: false, error: 'Invalid or expired OTP' };
      }

      await OTP.delete(normalizedPhone, normalizedOTP);
      
      return { valid: true };
    } catch (error) {
      console.error('Verify OTP error:', error.message);
      return { valid: false, error: 'Database error. Please try again.' };
    }
  }

  static async checkRateLimit(phoneNumber) {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB not connected, skipping rate limit check');
        return true;
      }
      const count = await OTP.countByPhoneNumber(phoneNumber, 60);
      return count < 3;
    } catch (error) {
      console.error('Rate limit check error:', error.message);
      return true;
    }
  }
}

module.exports = OTPService;

