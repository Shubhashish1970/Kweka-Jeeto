/**
 * Test MongoDB connectivity using MONGODB_URI (e.g. from GitHub Secrets).
 * Usage: MONGODB_URI="mongodb+srv://..." node scripts/test-mongodb-connection.js
 * In GitHub Actions: env.MONGODB_URI is set from secrets.
 */
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI environment variable.');
  process.exit(1);
}

// Mask password in logs (replace with ***)
const safeUri = uri.replace(/:[^:@]+@/, ':****@');
console.log('Connecting to MongoDB...', safeUri);

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('MongoDB connection OK.');
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('Disconnected.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    if (err.message && err.message.includes('ENOTFOUND')) {
      console.error('Hint: Check the hostname in MONGODB_URI (e.g. cluster.xxxxx.mongodb.net).');
    }
    if (err.message && err.message.includes('authentication')) {
      console.error('Hint: Check username and password in MONGODB_URI.');
    }
    process.exit(1);
  });
