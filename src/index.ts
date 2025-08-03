import { createApp } from './app';
import { RedisService, SchedulerService } from './services';
import { logger } from './utils';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    const redisService = new RedisService();
    await redisService.connect();

    const app = createApp(redisService);
    
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    const schedulerService = new SchedulerService(redisService);
    schedulerService.start();

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      schedulerService.stop();
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await redisService.disconnect();
          logger.info('Redis connection closed');
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