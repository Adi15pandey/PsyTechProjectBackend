const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 
  `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}/${process.env.DB_NAME || 'psytech_db'}`;

const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority'
};

let retryCount = 0;
const maxRetries = 5;

const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('MongoDB connected successfully');
    retryCount = 0;
  } catch (err) {
    retryCount++;
    console.error(`MongoDB connection error (attempt ${retryCount}/${maxRetries}):`, err.message);
    
    if (err.message.includes('whitelist') || err.message.includes('ECONNRESET') || err.message.includes('TLS')) {
      console.error('\n========================================');
      console.error('MONGODB ATLAS IP WHITELIST REQUIRED');
      console.error('========================================');
      console.error('1. Go to: https://cloud.mongodb.com');
      console.error('2. Select your cluster');
      console.error('3. Go to Network Access');
      console.error('4. Click "Add IP Address"');
      console.error('5. Click "Allow Access from Anywhere"');
      console.error('6. Enter: 0.0.0.0/0');
      console.error('7. Click Confirm');
      console.error('8. Wait 1-2 minutes');
      console.error('========================================\n');
    }
    
    if (retryCount < maxRetries) {
      console.log(`Retrying connection in 5 seconds...`);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error('Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

connectWithRetry();

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
  retryCount = 0;
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
  if (process.env.NODE_ENV === 'production') {
    console.log('Attempting to reconnect...');
    setTimeout(connectWithRetry, 5000);
  }
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = mongoose;
