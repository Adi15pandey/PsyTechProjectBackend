const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

class JWTService {
  static generateToken(userId, phoneNumber) {
    const payload = {
      userId,
      phoneNumber
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format');
    }

    return parts[1];
  }
}

module.exports = JWTService;

