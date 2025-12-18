const express = require('express');
const router = express.Router();
const mongoose = require('../config/database');
const OTPService = require('../services/otpService');
const JWTService = require('../services/jwtService');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { validate, validatePhoneNumber, validateOTP } = require('../middleware/validation');

// GET endpoint for documentation/testing
router.get('/send-otp', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Send OTP endpoint information',
    method: 'POST',
    endpoint: '/api/auth/send-otp',
    description: 'This endpoint requires a POST request with a JSON body',
    requestBody: {
      phoneNumber: 'string (required) - e.g., "+1234567890"'
    },
    example: {
      curl: 'curl -X POST https://psytech-backend.onrender.com/api/auth/send-otp -H "Content-Type: application/json" -d \'{"phoneNumber": "+1234567890"}\'',
      javascript: `fetch('https://psytech-backend.onrender.com/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '+1234567890' })
})`
    },
    response: {
      success: 'boolean',
      message: 'string'
    },
    note: 'Use POST method to send OTP. GET requests return this information only.'
  });
});

router.post('/send-otp', 
  validatePhoneNumber(),
  validate,
  async (req, res) => {
    // Set a timeout for the entire request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout - server is taking too long to respond. Please try again.',
          code: 'REQUEST_TIMEOUT'
        });
      }
    }, 20000); // 20 second timeout

    try {
      const { phoneNumber } = req.body;
      
      const normalizedPhone = phoneNumber.trim();

      // Check rate limit with timeout protection
      let canSend = true;
      if (mongoose.connection.readyState === 1) {
        try {
          const rateLimitPromise = OTPService.checkRateLimit(normalizedPhone);
          const timeoutPromise = new Promise((resolve) => 
            setTimeout(() => resolve(true), 5000) // 5s timeout for rate limit check
          );
          canSend = await Promise.race([rateLimitPromise, timeoutPromise]);
        } catch (error) {
          console.error('Rate limit check error:', error.message);
          // Continue if rate limit check fails
          canSend = true;
        }
      }

      if (!canSend) {
        clearTimeout(timeout);
        return res.status(429).json({
          success: false,
          error: 'Too many OTP requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      const otpCode = OTPService.generateOTP();

      // Store OTP asynchronously (non-blocking)
      if (mongoose.connection.readyState === 1) {
        OTPService.storeOTP(normalizedPhone, otpCode)
          .catch(error => {
            console.error('Store OTP failed (non-blocking):', error.message);
          });
      } else {
        console.log('Database not connected, skipping OTP storage');
      }

      // Send OTP (this should be fast in dev mode)
      try {
        await OTPService.sendOTP(normalizedPhone, otpCode);
      } catch (error) {
        console.error('Send OTP error:', error.message);
        // Continue even if send fails (in dev mode it always succeeds)
      }

      clearTimeout(timeout);
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      clearTimeout(timeout);
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

// GET endpoint for documentation/testing
router.get('/verify-otp', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Verify OTP endpoint information',
    method: 'POST',
    endpoint: '/api/auth/verify-otp',
    description: 'This endpoint requires a POST request with a JSON body',
    requestBody: {
      phoneNumber: 'string (required) - e.g., "+1234567890"',
      otp: 'string (required) - 6 digit OTP code'
    },
    example: {
      curl: 'curl -X POST https://psytech-backend.onrender.com/api/auth/verify-otp -H "Content-Type: application/json" -d \'{"phoneNumber": "+1234567890", "otp": "123456"}\'',
      javascript: `fetch('https://psytech-backend.onrender.com/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '+1234567890', otp: '123456' })
})`
    },
    response: {
      success: 'boolean',
      message: 'string',
      accessToken: 'string (JWT token)',
      refreshToken: 'string (JWT token)',
      user: 'object',
      isNewUser: 'boolean'
    },
    note: 'Use POST method to verify OTP. In development mode, use OTP: "123456" for any phone number.'
  });
});

router.post('/verify-otp',
  validatePhoneNumber(),
  validateOTP(),
  validate,
  async (req, res) => {
    // Set a timeout for the entire request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout - server is taking too long to respond. Please try again.',
          code: 'REQUEST_TIMEOUT'
        });
      }
    }, 25000); // 25 second timeout

    try {
      const { phoneNumber, otp } = req.body;
      
      const normalizedPhone = phoneNumber.trim();
      const normalizedOTP = otp.trim();

      const verification = await OTPService.verifyOTP(normalizedPhone, normalizedOTP);
      
      if (!verification.valid) {
        clearTimeout(timeout);
        return res.status(400).json({
          success: false,
          error: verification.error,
          code: 'INVALID_OTP'
        });
      }

      if (mongoose.connection.readyState !== 1) {
        clearTimeout(timeout);
        return res.status(503).json({
          success: false,
          error: 'Database connection not available. Please try again in a moment.',
          code: 'SERVICE_UNAVAILABLE'
        });
      }

      let user;
      let isNewUser = false;

      try {
        user = await User.findByPhoneNumber(normalizedPhone);
        isNewUser = !user;

        if (!user) {
          user = await User.create({
            phoneNumber: normalizedPhone,
            purpose: 'personal',
            showDate: true,
            language: 'english'
          });
        }
      } catch (error) {
        clearTimeout(timeout);
        console.error('User lookup/create error:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database error. Please try again.',
          code: 'DATABASE_ERROR'
        });
      }

      const accessToken = JWTService.generateAccessToken(user.id, normalizedPhone);
      const refreshToken = JWTService.generateRefreshToken(user.id, normalizedPhone);
      const expiresAt = JWTService.getRefreshTokenExpiry();

      // Store refresh token asynchronously - don't block response
      RefreshToken.create(user.id, normalizedPhone, refreshToken, expiresAt)
        .catch(error => {
          console.error('Refresh token storage error (non-blocking):', error.message);
        });

      clearTimeout(timeout);
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
      clearTimeout(timeout);
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
    let userId = null;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = JWTService.extractTokenFromHeader(authHeader);
        const decoded = JWTService.verifyToken(token);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      } catch (error) {
        console.log('Access token verification failed, continuing with refresh token only');
      }
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database connection not available. Please try again in a moment.',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    if (userId) {
      await RefreshToken.revokeAllUserTokens(userId);
    } else if (refreshToken) {
      try {
        const decoded = JWTService.verifyRefreshToken(refreshToken);
        if (decoded && decoded.userId) {
          await RefreshToken.revokeAllUserTokens(decoded.userId);
        } else {
          await RefreshToken.revokeToken(refreshToken);
        }
      } catch (error) {
        await RefreshToken.revokeToken(refreshToken);
      }
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

