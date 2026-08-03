import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiV1Routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app: Application = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // Allows embedded UI fonts and styles
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root route summary for API clients vs static UI for browsers
app.get('/', (req: Request, res: Response, next) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    res.status(200).json({
      name: 'Agency Management System (AMS) Prototype',
      version: '1.0.0',
      documentation:
        '/api/v1/customers, /api/v1/policies, /api/v1/policies/:id/dec-page, /api/v1/integration/import, /api/v1/integration/dry-run',
      health: '/health',
    });
    return;
  }
  next();
});

// Serve static frontend files
app.use(express.static(publicDir));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Core AMS Prototype Engine',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

// API Routes V1
app.use('/api/v1', apiV1Routes);

// Global Error Middleware
app.use(errorHandler);

export default app;
