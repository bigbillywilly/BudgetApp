import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, isDevelopment } from './config/environment';

// Import middleware (we'll create these next)
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/errorHandler';

// Import routes (we'll create these later)
// import { authRoutes } from './routes/auth.routes';
// import { userRoutes } from './routes/user.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: isDevelopment ? 'http://localhost:5173' : process.env.CLIENT_URL,
  credentials: true,
}));

// Logging
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '1.0.0',
  });
});

// API routes (we'll add these later)
// app.use('/api/auth', authRoutes);
// app.use('/api/user', userRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;