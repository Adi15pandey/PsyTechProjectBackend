const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate, validateRegister } = require('../middleware/validation');
const User = require('../models/User');
const UploadService = require('../services/uploadService');

const upload = UploadService.getMulterUpload();

router.post('/register',
  authenticate,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        phoneNumber,
        name,
        businessName,
        purpose,
        showDate,
        language
      } = req.body;

      if (!purpose || !['personal', 'business'].includes(purpose)) {
        return res.status(400).json({
          success: false,
          error: 'Purpose is required and must be "personal" or "business"',
          code: 'VALIDATION_ERROR'
        });
      }

      const updateData = {
        phoneNumber: phoneNumber || req.user.phoneNumber,
        purpose
      };

      if (name !== undefined) updateData.name = name;
      if (businessName !== undefined) updateData.businessName = businessName;
      if (showDate !== undefined) updateData.showDate = showDate === 'true' || showDate === true;
      if (language !== undefined) updateData.language = language;

      if (req.files) {
        if (req.files.profileImage && req.files.profileImage[0]) {
          const profileImagePath = await UploadService.uploadImage(
            req.files.profileImage[0],
            userId,
            'profile'
          );
          updateData.profileImagePath = UploadService.getPublicUrl(profileImagePath);
        }

        if (req.files.logo && req.files.logo[0]) {
          const logoPath = await UploadService.uploadImage(
            req.files.logo[0],
            userId,
            'logo'
          );
          updateData.logoPath = UploadService.getPublicUrl(logoPath);
        }
      }

      let user = await User.findById(userId);
      
      if (user) {
        user = await User.update(userId, updateData);
      } else {
        user = await User.create(updateData);
      }

      res.status(200).json({
        success: true,
        message: 'User registered successfully',
        user: User.formatUser(user)
      });
    } catch (error) {
      console.error('Register Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user',
        code: 'SERVER_ERROR'
      });
    }
  }
);

router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      user: User.formatUser(user)
    });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      code: 'SERVER_ERROR'
    });
  }
});

router.put('/me',
  authenticate,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const updateData = {};

      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.businessName !== undefined) updateData.businessName = req.body.businessName;
      if (req.body.purpose !== undefined) {
        if (!['personal', 'business'].includes(req.body.purpose)) {
          return res.status(400).json({
            success: false,
            error: 'Purpose must be "personal" or "business"',
            code: 'VALIDATION_ERROR'
          });
        }
        updateData.purpose = req.body.purpose;
      }
      if (req.body.showDate !== undefined) {
        updateData.showDate = req.body.showDate === 'true' || req.body.showDate === true;
      }
      if (req.body.language !== undefined) {
        if (!['english', 'hindi'].includes(req.body.language)) {
          return res.status(400).json({
            success: false,
            error: 'Language must be "english" or "hindi"',
            code: 'VALIDATION_ERROR'
          });
        }
        updateData.language = req.body.language;
      }

      if (req.files) {
        if (req.files.profileImage && req.files.profileImage[0]) {
          const profileImagePath = await UploadService.uploadImage(
            req.files.profileImage[0],
            userId,
            'profile'
          );
          updateData.profileImagePath = UploadService.getPublicUrl(profileImagePath);
        }

        if (req.files.logo && req.files.logo[0]) {
          const logoPath = await UploadService.uploadImage(
            req.files.logo[0],
            userId,
            'logo'
          );
          updateData.logoPath = UploadService.getPublicUrl(logoPath);
        }
      }

      const user = await User.update(userId, updateData);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: User.formatUser(user)
      });
    } catch (error) {
      console.error('Update User Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        code: 'SERVER_ERROR'
      });
    }
  }
);

module.exports = router;

