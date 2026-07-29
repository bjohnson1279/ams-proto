import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiV1Routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'AMS Prototype Engine',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime()
  });
});

// API Routes V1
app.use('/api/v1', apiV1Routes);

// Root route summary
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'Agency Management System (AMS) Prototype',
    version: '1.0.0',
    documentation: '/api/v1/customers, /api/v1/policies, /api/v1/policies/:id/dec-page, /api/v1/integration/import',
    health: '/health'
  });
});

// Global Error Middleware
app.use(errorHandler);

export default app;
