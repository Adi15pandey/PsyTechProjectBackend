const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 
  `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}/${process.env.DB_NAME || 'psytech_db'}`;

async function initDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    // MongoDB will create collections automatically when first document is inserted
    // No need for explicit schema creation like SQL databases
    
    console.log('✅ Database initialized successfully!');
    console.log('📝 Collections will be created automatically when first document is inserted');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
}

initDatabase();
