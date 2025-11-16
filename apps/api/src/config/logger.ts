import winston from 'winston';
import { env } from './env';

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: `${env.LOG_DIR}/error.log`,
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: `${env.LOG_DIR}/combined.log`,
    })
  );
}
