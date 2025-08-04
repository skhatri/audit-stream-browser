import { createApp } from './app';
import { RedisService, AuditService, CassandraService } from './services';
import { logger } from './utils';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    const redisService = new RedisService();
    await redisService.connect();

    const auditService = new AuditService();
    await auditService.connect();

    const cassandraService = new CassandraService();
    await cassandraService.connect();

    const app = createApp(redisService, auditService, cassandraService);
    
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} - Event-driven architecture with Cassandra`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await Promise.all([
            redisService.disconnect(),
            auditService.disconnect(),
            cassandraService.disconnect()
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