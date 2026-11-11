const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

// 1. Validate required environment variables at startup
config.validateEnv();

let server;

async function startServer() {
  try {
    // 2. Connect to Database
    await connectDB(config.mongodbUri);

    // 3. Start Express HTTP Server
    server = app.listen(config.port, () => {
      console.log('--------------------------------------------------');
      console.log(`🚀 RecallC Server running in ${config.nodeEnv} mode`);
      console.log(`📡 Listening on http://localhost:${config.port}`);
      console.log(`🎯 API Base: http://localhost:${config.port}/api`);
      console.log(`🌐 Allowed Client URL: ${config.clientUrl}`);
      console.log('--------------------------------------------------');
    });

    // 4. Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n[Process] Received ${signal}. Starting graceful shutdown...`);
      if (server) {
        server.close(async () => {
          console.log('[Server] HTTP server closed');
          await disconnectDB();
          console.log('[Process] RecallC gracefully terminated');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

