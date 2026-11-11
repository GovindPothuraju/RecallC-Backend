const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Cross-Origin Resource Sharing
// Middleware
const baseAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://recall-c-frontend.vercel.app",
  "https://recallc-frontend.vercel.app"
];

if (config.clientUrl) {
  const envOrigins = config.clientUrl.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  for (const o of envOrigins) {
    if (!baseAllowedOrigins.includes(o)) {
      baseAllowedOrigins.push(o);
    }
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, "");
    const isExplicitlyAllowed = baseAllowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin
    );

    let isVercelDomain = false;
    try {
      const host = new URL(normalizedOrigin).hostname;
      if (host.endsWith('.vercel.app')) {
        isVercelDomain = true;
      }
    } catch (_) {}

    if (isExplicitlyAllowed || isVercelDomain) {
      return callback(null, true);
    }

    console.log("Blocked CORS origin:", origin);

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Timezone",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],

  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request performance logger (monitors 200ms target)
app.use(requestLogger);

// Rate limiting on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    errors: ['Rate limit exceeded']
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API Routes
app.use('/api', routes);

// 404 Catch-all
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;

