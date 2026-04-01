import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { env } from './config/env';
import routes from './routes';

export const app = express();

// Security middleware
app.use(helmet());

// Configure CORS to accept multiple origins
const allowedOrigins = env.FRONTEND_URL;
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      // Em desenvolvimento, permite qualquer origem
      if (env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      // Em produção, verifica a whitelist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests em dev, 100 em prod
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  skip: (req) => {
    // Skip rate limiting para localhost em desenvolvimento
    if (env.NODE_ENV !== 'production') {
      const ip = req.ip || req.socket.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  },
});
app.use('/api/', limiter);

// Body parsing - limite aumentado para backups grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parsing
app.use(cookieParser());

// Servir arquivos estáticos (uploads)
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));
logger.info(`📁 Serving static files from: ${uploadsPath}`);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'EJR Organizador API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint não encontrado',
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);
