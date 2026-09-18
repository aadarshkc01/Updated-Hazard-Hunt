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

    const server = app.listen(port, () => {
      console.log(`Hazard Hunt API server running on port ${port}`);
      console.log(`Health check available at: http://localhost:${port}/api/health`);
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
app.use(
  cors({
    origin: true, // Allow frontend dev server and clients
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/compliance', complianceRoutes);

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
