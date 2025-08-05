import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || './logs';

const createLogger = () => {
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaString = '';
        if (Object.keys(meta).length > 0) {
          metaString = ' ' + JSON.stringify(meta);
        }
        return `[${level.toUpperCase()}] ${timestamp} - ${message}${metaString}`;
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'audit-stream-error.log'),
        level: 'error',
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 5,
        tailable: true
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'audit-stream-application.log'),
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10,
        tailable: true
      })
    ],
    exceptionHandlers: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join(logDir, 'audit-stream-exceptions.log')
      })
    ],
    rejectionHandlers: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join(logDir, 'audit-stream-rejections.log')
      })
    ]
  });

  if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));
  }

  return logger;
};

export const logger = createLogger();