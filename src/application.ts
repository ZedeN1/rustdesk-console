import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import { businessWritesAllowed } from './updater/maintenance';
import { rbacRequestScopeMiddleware } from './modules/rbac/rbac-request-scope.middleware';
import { createAppLogger } from './common/logging/create-app-logger';
import { resolveLogLevels } from './common/logging/log-level.util';
import { requestLoggingMiddleware } from './common/logging/request-logging.middleware';

export async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: createAppLogger(),
  });

  const minimumLevel = resolveLogLevels(process.env.LOG_LEVEL)[0];
  logger.log(
    minimumLevel === 'verbose' || minimumLevel === 'debug'
      ? `Log level: ${minimumLevel}`
      : `Log level: ${minimumLevel} (set LOG_LEVEL=debug for diagnostic output)`,
  );

  app.enableShutdownHooks();

  // Log every finished request, including responses produced by the
  // middleware below (such as the maintenance 503).
  app.use(requestLoggingMiddleware);

  // Bind the request-scoped RBAC cache before anything else so guards,
  // interceptors and handlers all share one authorization snapshot.
  app.use(rbacRequestScopeMiddleware);
  // Direct backend clients must also respect the persistent maintenance fence.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isSystemUpdateStatusRequest =
      request.method === 'GET' &&
      (request.path === '/api/system-update/jobs/current' ||
        /^\/api\/system-update\/jobs\/[^/]+$/.test(request.path));

    if (
      !businessWritesAllowed() &&
      request.path !== '/api/system-update/health' &&
      !isSystemUpdateStatusRequest
    ) {
      response.status(503).setHeader('Retry-After', '5');
      response.json({
        code: 'SYSTEM_MAINTENANCE',
        message: 'System update maintenance is in progress.',
      });
      return;
    }
    next();
  });

  // Configure cookie parsing middleware
  app.use(cookieParser());

  // Set global route prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
}
