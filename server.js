const fs = require('fs');
const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const AppError = require('./src/utils/appError');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const enrollmentRoutes = require('./src/routes/enrollmentRoutes');
const userRoutes = require('./src/routes/userRoutes');
const schoolRoutes = require('./src/routes/schoolRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const classRoutes = require('./src/routes/classRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const behaviorRoutes = require('./src/routes/behaviorRoutes');
const academicRoutes = require('./src/routes/academicRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const platformRoutes = require('./src/routes/platformRoutes');
const houseRoutes = require('./src/routes/houseRoutes');
const welfareRoutes = require('./src/routes/welfareRoutes');
const boardingAttendanceRoutes = require('./src/routes/boardingAttendanceRoutes');
const feesRoutes = require('./src/modules/fees/fees.routes');
const timetableRoutes = require('./src/modules/timetable/timetable.routes');
const examsRoutes = require('./src/modules/exams/exams.routes');
const libraryRoutes = require('./src/modules/library/library.routes');
const calendarRoutes = require('./src/modules/calendar/calendar.routes');
const hrRoutes = require('./src/modules/hr/hr.routes');
const analyticsRoutes = require('./src/modules/analytics/analytics.routes');
const parentPortalRoutes = require('./src/modules/parentPortal/parentPortal.routes');
const { registerSmsJobs } = require('./src/jobs/smsJobs');

// Ensure uploads directory exists
const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
const uploadsDir = path.join(__dirname, uploadPath);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

const app = express();

// ========================
// Security Middleware
// ========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3001',
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting — disabled in development to avoid 429 errors during local testing
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
      status: 'error',
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
      status: 'error',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
}

// ========================
// Body Parsing Middleware
// ========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ========================
// Static Files
// ========================
app.use('/uploads', express.static(path.join(__dirname, uploadPath)));

// ========================
// Request Logger (Development)
// ========================
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ========================
// Health Check
// ========================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'PTCS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ========================
// API Routes
// ========================
app.use('/api/auth', authRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/welfare', welfareRoutes);
app.use('/api/boarding-attendance', boardingAttendanceRoutes);
app.use('/api/v1/fees', feesRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/exams', examsRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/hr', hrRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/parent', parentPortalRoutes);

// ========================
// 404 Handler
// ========================
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found on this server.`, 404));
});

// ========================
// Global Error Handler
// ========================
app.use(errorHandler);

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    registerSmsJobs();

    const server = app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  PTCS Backend API`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Server running on port: ${PORT}`);
      console.log(`  API Base URL: http://localhost:${PORT}/api`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`========================================\n`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        console.error('Forcing shutdown after timeout...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION:', err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Skip auto-connect/listen under Jest — tests import `app` and manage their own
// in-memory DB connection/lifecycle (see backend/tests/setup.js).
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
