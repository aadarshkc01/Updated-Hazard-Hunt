import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seeds/seedData.js';

import authRoutes from './routes/authRoutes.js';
import scenarioRoutes from './routes/scenarioRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';

dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 5001;

const startServer = async (port = DEFAULT_PORT) => {
  try {
    await connectDB();
    await seedDatabase();

    // Render and most PaaS providers inject PORT and route traffic to the
    // container over all interfaces, so binding to every interface is correct
    // here. On Windows 0.0.0.0 is not a valid hostname for a printed URL, so
    // use localhost purely for display.
    const displayHost = process.platform === 'win32' ? 'localhost' : '0.0.0.0';

    const server = app.listen(port, () => {
      console.log(`Hazard Hunt API server running on port ${port}`);
      console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://${displayHost}:${port}/api/health`);
      console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
    });

    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        console.warn(`Port ${port} is busy. Retrying on ${nextPort}.`);
        await startServer(nextPort);
      } else {
        console.error('Fatal: Failed to start server:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Fatal: Failed to start server:', error);
    process.exit(1);
  }
};

// Middleware
//
// CORS origin is an explicit allowlist. `origin: true` reflects whatever the
// caller sent while also allowing credentials, which lets any site on the
// internet issue authenticated requests against this API from a logged-in
// browser. Origins are read from CLIENT_ORIGIN as a comma-separated list.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and non-browser callers (curl, Render health checks) send
      // no Origin header. Allow those; they cannot be cross-site request
      // forgeries, because a browser always attaches the header.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Reject by omitting the CORS headers rather than by throwing. The
      // browser then blocks the response on its own, which is the enforcement
      // that actually matters, and the request does not surface as a spurious
      // 500 in server logs or uptime monitoring.
      console.warn(`Blocked CORS request from disallowed origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/compliance', complianceRoutes);

// Root route (fixes "Route not found: /")
app.get('/', (req, res) => {
  res.send('Hazard Hunt API is running 🚀');
});

// System Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Hazard Hunt API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

startServer();
