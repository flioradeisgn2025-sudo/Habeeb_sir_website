const mongoose = require('mongoose');

// Serverless-friendly connection: cache the connection promise across
// invocations (Vercel reuses the same Node process between requests on a warm
// lambda) so we don't open a new connection per request and we never query
// before the connection is ready.
let cached = global.__mongoose;
if (!cached) {
  cached = global.__mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — configure it in your environment (Vercel: Settings → Environment Variables).');
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 20000,
      })
      .then((m) => {
        console.log(`MongoDB Connected: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        // Reset so the next request can retry instead of caching a failure
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
