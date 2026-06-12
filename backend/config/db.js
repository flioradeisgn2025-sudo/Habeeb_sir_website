const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set — configure it in your environment (Vercel: Settings → Environment Variables).');
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't process.exit() — on serverless (Vercel) that kills the function
    // with no useful response. Requests will fail with a clear DB error instead.
  }
};

module.exports = connectDB;
