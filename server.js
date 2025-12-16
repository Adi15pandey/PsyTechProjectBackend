const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const mongoose = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PsyTech Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sendOTP: 'POST /api/auth/send-otp',
      verifyOTP: 'POST /api/auth/verify-otp',
      register: 'POST /api/user/register',
      getProfile: 'GET /api/user/me',
      updateProfile: 'PUT /api/user/me'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    availableEndpoints: {
      health: 'GET /health',
      sendOTP: 'POST /api/auth/send-otp',
      verifyOTP: 'POST /api/auth/verify-otp',
      register: 'POST /api/user/register',
      getProfile: 'GET /api/user/me',
      updateProfile: 'PUT /api/user/me'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB',
        code: 'FILE_TOO_LARGE'
      });
    }
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;

