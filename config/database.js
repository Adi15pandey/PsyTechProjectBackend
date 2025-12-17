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
    console.log(`Attempting to connect to MongoDB...`);
    console.log(`Connection string: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);
    
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('✅ MongoDB connected successfully');
    retryCount = 0;
  } catch (err) {
    retryCount++;
    console.error(`❌ MongoDB connection error (attempt ${retryCount}/${maxRetries}):`, err.message);
    
    if (err.message.includes('whitelist') || err.message.includes('ECONNRESET') || err.message.includes('TLS') || err.message.includes('socket disconnected')) {
      console.error('\n========================================');
      console.error('⚠️  MONGODB ATLAS IP WHITELIST REQUIRED');
      console.error('========================================');
      console.error('The connection is being blocked by MongoDB Atlas.');
      console.error('You MUST whitelist Render IPs in MongoDB Atlas:');
      console.error('');
      console.error('Steps:');
      console.error('1. Go to: https://cloud.mongodb.com');
      console.error('2. Select your cluster: psytechproject');
      console.error('3. Click "Network Access" (left sidebar)');
      console.error('4. Click "Add IP Address" (green button)');
      console.error('5. Click "Allow Access from Anywhere"');
      console.error('6. Enter: 0.0.0.0/0');
      console.error('7. Add comment: "Render deployment"');
      console.error('8. Click "Confirm"');
      console.error('9. Wait 1-2 minutes for changes to apply');
      console.error('');
      console.error('After whitelisting, the connection will retry automatically.');
      console.error('========================================\n');
    }
    
    if (retryCount < maxRetries) {
      const waitTime = Math.min(retryCount * 5, 30);
      console.log(`⏳ Retrying connection in ${waitTime} seconds... (${retryCount}/${maxRetries})`);
      setTimeout(connectWithRetry, waitTime * 1000);
    } else {
      console.error('⚠️  Max retries reached. Server will continue but database operations will fail.');
      console.error('⚠️  Please whitelist MongoDB Atlas IPs and the connection will retry automatically.');
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
  console.log('⚠️  Mongoose disconnected');
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Attempting to reconnect in 10 seconds...');
    setTimeout(connectWithRetry, 10000);
  }
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = mongoose;
module.exports.isConnected = isConnected;
