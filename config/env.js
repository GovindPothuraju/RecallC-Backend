const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnv() {
  if (process.env.NODE_ENV === 'test') {
    return; // Allow test environment to run without physical .env
  }

  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar] || process.env[envVar].trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('FATAL CONFIGURATION ERROR: Missing required environment variables:');
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error('Please configure them in backend/.env (refer to backend/.env.example)');
    process.exit(1);
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/recallc',
  jwtSecret: process.env.JWT_SECRET || 'recallc_dev_test_secret_key_at_least_32_chars_long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  validateEnv
};

module.exports = config;
