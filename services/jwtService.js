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
      if (!token || typeof token !== 'string') {
        throw new Error('Token must be a non-empty string');
      }
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token signature');
      }
      throw new Error('Invalid or expired token');
    }
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') {
      throw new Error('Authorization header missing');
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format');
    }

    const token = parts[1];
    if (!token || token.length === 0) {
      throw new Error('Token is empty');
    }

    return token;
  }
}

module.exports = JWTService;

