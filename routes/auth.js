const express = require('express');
const router = express.Router();
const OTPService = require('../services/otpService');
const JWTService = require('../services/jwtService');
const User = require('../models/User');
const { validate, validatePhoneNumber, validateOTP } = require('../middleware/validation');

router.post('/send-otp', 
  validatePhoneNumber(),
  validate,
  async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      const canSend = await OTPService.checkRateLimit(phoneNumber);
      if (!canSend) {
        return res.status(429).json({
          success: false,
          error: 'Too many OTP requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      const otpCode = OTPService.generateOTP();

      await OTPService.storeOTP(phoneNumber, otpCode);

      await OTPService.sendOTP(phoneNumber, otpCode);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      console.error('Send OTP Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send OTP',
        code: 'SERVER_ERROR'
      });
    }
  }
);

router.post('/verify-otp',
  validatePhoneNumber(),
  validateOTP(),
  validate,
  async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;

      const verification = await OTPService.verifyOTP(phoneNumber, otp);
      
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          error: verification.error,
          code: 'INVALID_OTP'
        });
      }

      let user = await User.findByPhoneNumber(phoneNumber);
      const isNewUser = !user;

      if (!user) {
        user = await User.create({
          phoneNumber,
          purpose: 'personal',
          showDate: true,
          language: 'english'
        });
      }

      const token = JWTService.generateToken(user.id, phoneNumber);

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        token,
        user: User.formatUser(user),
        isNewUser
      });
    } catch (error) {
      console.error('Verify OTP Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify OTP',
        code: 'SERVER_ERROR'
      });
    }
  }
);

module.exports = router;

