import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import apiV1Routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { tenantMiddleware } from './middleware/tenant.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app: Application = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // Allows embedded UI fonts and styles
  })
);

// 🛡️ Sentinel: Fix overly permissive CORS configuration to prevent unauthorized cross-origin requests
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy to ensure correct IP resolution for rate limiting behind reverse proxies
app.set('trust proxy', 1);

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

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to API calls only
app.use('/api', apiLimiter);

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Core AMS Prototype Engine',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

// API Routes V1 with Multi-Tenant Middleware
app.use('/api/v1', tenantMiddleware, apiV1Routes);

// Global Error Middleware
app.use(errorHandler);

export default app;
