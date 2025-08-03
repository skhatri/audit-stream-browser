import { createApp } from './app';
import { RedisService, SchedulerService, AuditService } from './services';
import { logger } from './utils';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    const redisService = new RedisService();
    await redisService.connect();

    const auditService = new AuditService();
    await auditService.connect();

    const app = createApp(redisService, auditService);
    
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    const schedulerService = new SchedulerService(redisService, auditService);
    schedulerService.start();

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      schedulerService.stop();
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await Promise.all([
            redisService.disconnect(),
            auditService.disconnect()
          ]);
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  logger.error('Unhandled error during startup:', error);
  process.exit(1);
});