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
    await OTP.deleteMany({ phoneNumber });

    const otp = new OTP({
      phoneNumber,
      otpCode,
      expiresAt
    });

    await otp.save();
    return otp;
  }

  static async findByPhoneAndCode(phoneNumber, otpCode) {
    const otp = await OTP.findOne({
      phoneNumber,
      otpCode,
      expiresAt: { $gt: new Date() }
    });
    
    return otp;
  }

  static async delete(phoneNumber, otpCode) {
    await OTP.deleteOne({ phoneNumber, otpCode });
  }

  static async deleteExpired() {
    await OTP.deleteMany({ expiresAt: { $lte: new Date() } });
  }

  static async countByPhoneNumber(phoneNumber, minutes = 60) {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const count = await OTP.countDocuments({
      phoneNumber,
      createdAt: { $gt: cutoffTime }
    });
    
    return count;
  }
}

module.exports = OTPModel;
