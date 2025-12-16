const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg,
      code: 'VALIDATION_ERROR',
      details: errorMessages
    });
  }
  next();
};

const validatePhoneNumber = () => {
  return body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 16 })
    .withMessage('Phone number must be between 10 and 16 characters')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format. Must include country code (e.g., +919876543210)')
    .customSanitizer(value => value.trim());
};

const validateOTP = () => {
  return body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numeric characters')
    .customSanitizer(value => value.trim());
};

const validateRegister = () => {
  return [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Invalid phone number format'),
    body('purpose')
      .notEmpty()
      .withMessage('Purpose is required')
      .isIn(['personal', 'business'])
      .withMessage('Purpose must be either "personal" or "business"'),
    body('showDate')
      .optional()
      .isBoolean()
      .withMessage('showDate must be a boolean'),
    body('language')
      .optional()
      .isIn(['english', 'hindi'])
      .withMessage('Language must be either "english" or "hindi"')
  ];
};

module.exports = {
  validate,
  validatePhoneNumber,
  validateOTP,
  validateRegister
};

