const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

class JWTService {
  static generateAccessToken(userId, phoneNumber) {
    const payload = {
      userId,
      phoneNumber,
      type: 'access'
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY
    });
  }

  static generateRefreshToken(userId, phoneNumber) {
    const payload = {
      userId,
      phoneNumber,
      type: 'refresh'
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY
    });
  }

  static generateToken(userId, phoneNumber) {
    return this.generateAccessToken(userId, phoneNumber);
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

  static verifyRefreshToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Refresh token must be a non-empty string');
      }
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token signature');
      }
      throw new Error('Invalid or expired refresh token');
    }
  }

  static getRefreshTokenExpiry() {
    const days = parseInt(REFRESH_TOKEN_EXPIRY) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
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

