import app from './app';
import { config } from './config/environment';

const startServer = async (): Promise<void> => {
  try {
    console.log('Starting server without database...');

    // Start the server
    const server = app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(`Health check: http://localhost:${config.PORT}/health`);
      console.log(`API test: http://localhost:${config.PORT}/api/test`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string): void => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();