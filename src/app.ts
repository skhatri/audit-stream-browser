import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { corsMiddleware } from './middleware/cors';
import { createQueueRoutes } from './routes/queue';
import { createAuditRoutes } from './routes/audit';
import { createMonitoringRoutes } from './routes/monitoring';
import metricsRoutes from './routes/metrics';
import { RedisService, AuditService, CassandraService } from './services';
import { logger } from './utils';

export const createApp = (redisService: RedisService, auditService: AuditService, cassandraService: CassandraService): express.Application => {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.use('/api/queue', createQueueRoutes(redisService, cassandraService));
  app.use('/api/audit', createAuditRoutes(cassandraService));
  app.use('/api/monitoring', createMonitoringRoutes());
  app.use('/api/metrics', metricsRoutes);

  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ 
        success: false, 
        message: 'API route not found' 
      });
    } else {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });

  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  });

  return app;
};