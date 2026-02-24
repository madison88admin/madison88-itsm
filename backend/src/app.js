/**
 * Express Application Configuration
 * Main app setup and middleware configuration
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();

// 🔧 Trust proxy (required for Render behind load balancer; fixes rate limiter client IP detection)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, mobile apps, or server-to-server)
    if (!origin) return callback(null, true);

    // Build allowed origins list from env vars
    const defaultAllowed = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.FRONTEND_PROD_URL || 'https://m88itsm.netlify.app',
    ];
    const extra = (process.env.ADDITIONAL_CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const allowedOrigins = Array.from(new Set([...defaultAllowed, ...extra]));

    // Quick debug override to allow all origins when necessary (set in env)
    if (process.env.CORS_ALLOW_ALL === 'true') return callback(null, true);

    // Direct match first
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow same-host or wildcard subdomain matches (e.g. allow *.example.com)
    try {
      const originHost = new URL(origin).hostname;
      for (const a of allowedOrigins) {
        try {
          const allowedHost = new URL(a).hostname;
          if (originHost === allowedHost || originHost.endsWith(`.${allowedHost}`)) {
            return callback(null, true);
          }
        } catch (e) {
          // If allowed origin is not a full URL, compare raw strings
          if (a && (origin === a || originHost === a || originHost.endsWith(`.${a}`))) {
            return callback(null, true);
          }
        }
      }
    } catch (e) {
      // If URL parsing fails, fall through to deny
    }

    // Not allowed
    const err = new Error('CORS policy: origin not allowed');
    err.allowed = allowedOrigins;
    callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
};

if (process.env.NODE_ENV === 'development') {
  console.log('CORS options:', corsOptions);
}

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Request Logging
app.use(morgan('combined'));

// Body Parser Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting (configurable via env)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX_PROD = Number(process.env.RATE_LIMIT_MAX_PROD) || 500;
const RATE_LIMIT_MAX_DEV = Number(process.env.RATE_LIMIT_MAX_DEV) || 2000;

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: process.env.NODE_ENV === 'production' ? RATE_LIMIT_MAX_PROD : RATE_LIMIT_MAX_DEV,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Always allow health checks
    if (req.path === '/health') return true;
    // Allow disabling the limiter explicitly (useful for local debugging)
    if (process.env.SKIP_RATE_LIMIT === 'true') return true;
    return false;
  }
});

app.use('/api/', apiLimiter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/config', require('./routes/config.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/tickets', require('./routes/tickets.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/kb', require('./routes/knowledgebase.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/sla-governance', require('./routes/sla.routes'));
app.use('/api/bi', require('./routes/bi.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/ticket-templates', require('./routes/ticket-templates.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/admin', require('./routes/user-activity.routes'));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Placeholder routes - to be implemented
const { adminRouter, teamsRouter, changesRouter, assetsRouter } = require('./routes/placeholder.routes');
app.use('/api/admin', adminRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/changes', require('./routes/changes.routes'));
app.use('/api/assets', require('./routes/assets.routes'));

// 404 Handler
app.use((req, res) => {
  // Log 404s for debugging
  if (req.originalUrl.includes('confirm-resolution') || req.originalUrl.includes('reopen')) {
    console.log('404 on ticket route:', req.method, req.originalUrl);
  }
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error Handler Middleware - map service errors to correct HTTP status
app.use((err, req, res, next) => {
  let status = err.status;
  const message = err.message || 'Internal Server Error';
  if (status == null) {
    const lower = message.toLowerCase();
    if (lower.includes('forbidden') || lower.includes('insufficient permissions')) status = 403;
    else if (lower.includes('not found')) status = 404;
    else if (lower.includes('required') || lower.includes('invalid') || lower.includes('validation') || lower.includes('must be')) status = 400;
    else if (lower.includes('already exists') || lower.includes('duplicate') || lower.includes('pending') && lower.includes('override')) status = 409;
    else status = 500;
  }

  console.error('Error:', {
    status,
    message,
    stack: err.stack,
    url: req.originalUrl
  });

  res.status(status).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const db = require('./config/database');
app.set('db', db);

let redisClient;
try {
  redisClient = require('./config/redis');
} catch {
  redisClient = null;
}
app.set('redis', redisClient);

// Initialize cache manager
const CacheManager = require('./utils/cache');
const cache = new CacheManager(redisClient);
app.set('cache', cache);

module.exports = app;
