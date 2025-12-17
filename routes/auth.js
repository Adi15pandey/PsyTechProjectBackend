const express = require('express');
const router = express.Router();
const OTPService = require('../services/otpService');
const JWTService = require('../services/jwtService');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { validate, validatePhoneNumber, validateOTP } = require('../middleware/validation');

router.post('/send-otp', 
  validatePhoneNumber(),
  validate,
  async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      const normalizedPhone = phoneNumber.trim();

      const canSend = await OTPService.checkRateLimit(normalizedPhone);
      if (!canSend) {
        return res.status(429).json({
          success: false,
          error: 'Too many OTP requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      const otpCode = OTPService.generateOTP();

      await OTPService.storeOTP(normalizedPhone, otpCode);

      await OTPService.sendOTP(normalizedPhone, otpCode);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      console.error('Send OTP Error:', error.message || error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to send OTP',
        code: error.code || 'SERVER_ERROR'
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
      
      const normalizedPhone = phoneNumber.trim();
      const normalizedOTP = otp.trim();

      const verification = await OTPService.verifyOTP(normalizedPhone, normalizedOTP);
      
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          error: verification.error,
          code: 'INVALID_OTP'
        });
      }

      let user = await User.findByPhoneNumber(normalizedPhone);
      const isNewUser = !user;

      if (!user) {
        user = await User.create({
          phoneNumber: normalizedPhone,
          purpose: 'personal',
          showDate: true,
          language: 'english'
        });
      }

      const accessToken = JWTService.generateAccessToken(user.id, normalizedPhone);
      const refreshToken = JWTService.generateRefreshToken(user.id, normalizedPhone);
      const expiresAt = JWTService.getRefreshTokenExpiry();

      await RefreshToken.create(user.id, normalizedPhone, refreshToken, expiresAt);

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        accessToken,
        refreshToken,
        token: accessToken,
        expiresIn: 900,
        user: User.formatUser(user),
        isNewUser
      });
    } catch (error) {
      console.error('Verify OTP Error:', error.message || error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to verify OTP',
        code: error.code || 'SERVER_ERROR'
      });
    }
  }
);

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    
    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const decoded = JWTService.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'UNAUTHORIZED'
      });
    }

    await RefreshToken.revokeToken(refreshToken);

    const newAccessToken = JWTService.generateAccessToken(user.id, user.phoneNumber);
    const newRefreshToken = JWTService.generateRefreshToken(user.id, user.phoneNumber);
    const expiresAt = JWTService.getRefreshTokenExpiry();

    await RefreshToken.create(user.id, user.phoneNumber, newRefreshToken, expiresAt);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900
    });
  } catch (error) {
    console.error('Refresh Token Error:', error.message || error);
    res.status(401).json({
      success: false,
      error: error.message || 'Failed to refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.revokeToken(refreshToken);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout Error:', error.message || error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;

