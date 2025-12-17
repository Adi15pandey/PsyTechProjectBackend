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
    await RefreshToken.deleteMany({ userId, isRevoked: false });

    const refreshToken = new RefreshToken({
      token,
      userId,
      phoneNumber,
      expiresAt,
      isRevoked: false
    });

    await refreshToken.save();
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

