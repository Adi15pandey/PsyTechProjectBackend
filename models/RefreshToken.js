const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

class RefreshTokenModel {
  static async create(userId, phoneNumber, token, expiresAt) {
    try {
      await RefreshToken.deleteMany({ userId, isRevoked: false }).maxTimeMS(5000);
    } catch (error) {
      console.error('Delete old refresh tokens error:', error.message);
      // Continue even if cleanup fails
    }

    const refreshToken = new RefreshToken({
      token,
      userId,
      phoneNumber,
      expiresAt,
      isRevoked: false
    });

    // Add timeout protection
    const savePromise = refreshToken.save();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Refresh token creation timeout')), 10000)
    );
    await Promise.race([savePromise, timeoutPromise]);
    return refreshToken;
  }

  static async findByToken(token) {
    return await RefreshToken.findOne({
      token,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });
  }

  static async revokeToken(token) {
    await RefreshToken.updateOne(
      { token },
      { $set: { isRevoked: true } }
    );
  }

  static async revokeAllUserTokens(userId) {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    );
  }

  static async deleteExpired() {
    await RefreshToken.deleteMany({ expiresAt: { $lte: new Date() } });
  }
}

module.exports = RefreshTokenModel;

