import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod = null;

// The in-memory server is a development convenience only.
//
// It must never engage in production. On a host that restarts or idles out the
// process (Render free tier sleeps after ~15 minutes of inactivity, and any
// redeploy replaces the container), an in-memory database starts completely
// empty. Every user, compliance record and attempt score would silently
// disappear, and seeding would recreate only the demo accounts. So in
// production a missing or failing MONGODB_URI is a hard boot failure instead.
const isProduction = process.env.NODE_ENV === 'production';

const describeTarget = (uri) => {
  try {
    const host = new URL(uri.replace('mongodb+srv://', 'mongodb://')).host;
    return host;
  } catch {
    return '(unparseable URI)';
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && !uri.trim()) {
    if (isProduction) {
      console.error('FATAL: MONGODB_URI is set but empty.');
      process.exit(1);
    }
  }

  if (uri && uri.trim()) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      // Never mask a bad connection string in production.
      if (isProduction) {
        console.error(
          `FATAL: could not connect to MongoDB at ${describeTarget(uri)}.`,
        );
        console.error(`       Reason: ${error.message}`);
        console.error(
          '       Refusing to start on the in-memory fallback, because that ' +
            'database is wiped on every restart and would discard real user data.',
        );
        process.exit(1);
      }

      console.warn(
        `MongoDB connection failed (${error.message}). Falling back to the in-memory MongoDB for development...`,
      );
    }
  } else if (isProduction) {
    console.error('FATAL: MONGODB_URI is not set.');
    console.error(
      '       Set it to a MongoDB Atlas connection string. Starting against ' +
        'the in-memory fallback in production would silently discard all user data.',
    );
    process.exit(1);
  } else {
    console.log('No MONGODB_URI provided. Starting the embedded in-memory MongoDB server...');
  }

  // Development-only path.
  mongod = await MongoMemoryServer.create();
  const localUri = mongod.getUri();
  console.log(`In-memory MongoDB running at: ${localUri}`);
  const conn = await mongoose.connect(localUri);
  console.log(`In-memory MongoDB connected: ${conn.connection.host}`);
  return conn;
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
};