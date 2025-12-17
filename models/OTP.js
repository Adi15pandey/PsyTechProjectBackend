const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  otpCode: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

otpSchema.index({ phoneNumber: 1, otpCode: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

class OTPModel {
  static async create(phoneNumber, otpCode, expiresAt) {
    try {
      await OTP.deleteMany({ phoneNumber }).maxTimeMS(5000);

      const otp = new OTP({
        phoneNumber,
        otpCode,
        expiresAt
      });

      await otp.save();
      return otp;
    } catch (error) {
      console.error('Create OTP error:', error.message);
      throw error;
    }
  }

  static async findByPhoneAndCode(phoneNumber, otpCode) {
    try {
      const otp = await OTP.findOne({
        phoneNumber,
        otpCode,
        expiresAt: { $gt: new Date() }
      }).maxTimeMS(5000);
      
      return otp;
    } catch (error) {
      console.error('Find OTP error:', error.message);
      return null;
    }
  }

  static async delete(phoneNumber, otpCode) {
    await OTP.deleteOne({ phoneNumber, otpCode });
  }

  static async deleteExpired() {
    await OTP.deleteMany({ expiresAt: { $lte: new Date() } });
  }

  static async countByPhoneNumber(phoneNumber, minutes = 60) {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      const count = await OTP.countDocuments({
        phoneNumber,
        createdAt: { $gt: cutoffTime }
      }).maxTimeMS(5000);
      
      return count;
    } catch (error) {
      console.error('Count OTP error:', error.message);
      return 0;
    }
  }
}

module.exports = OTPModel;
