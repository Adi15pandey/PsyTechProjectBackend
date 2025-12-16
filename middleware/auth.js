const JWTService = require('../services/jwtService');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header is required',
        code: 'UNAUTHORIZED'
      });
    }

    const token = JWTService.extractTokenFromHeader(authHeader);
    const decoded = JWTService.verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'UNAUTHORIZED'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'UNAUTHORIZED'
      });
    }

    req.user = decoded;
    req.userData = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }
};

module.exports = { authenticate };

