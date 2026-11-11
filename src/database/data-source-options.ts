import { DataSourceOptions } from 'typeorm';
import { getDbPath, getDbType } from '../common/utils/data-dir.util';
import { DATABASE_ENTITIES } from './entities';
import { InitialSchema1790985600000 } from '../migrations/1790985600000-InitialSchema';
import { FixMySqlDefaultUserGroupIndex1790985600001 } from '../migrations/1790985600001-FixMySqlDefaultUserGroupIndex';
import { AddPasswordResetTokens1790985600002 } from '../migrations/1790985600002-AddPasswordResetTokens';
import { AddDeviceTombstones1791040000000 } from '../migrations/1791040000000-AddDeviceTombstones';
import { AddDeviceTombstoneReleaseTracking1791126400000 } from '../migrations/1791126400000-AddDeviceTombstoneReleaseTracking';

import {
  resolveDbLogMode,
  resolveSlowQueryMs,
  TypeOrmNestLogger,
} from './typeorm-logger';

export function createDataSourceOptions(): DataSourceOptions {
  const common = {
    entities: DATABASE_ENTITIES,
    migrations: [
      InitialSchema1790985600000,
      FixMySqlDefaultUserGroupIndex1790985600001,
      AddPasswordResetTokens1790985600002,
      AddDeviceTombstones1791040000000,
      AddDeviceTombstoneReleaseTracking1791126400000,
    ],
    migrationsRun: false,
    synchronize: false,
    // TypeOrmNestLogger does its own filtering based on DB_LOG.
    logging: true,
    logger: new TypeOrmNestLogger(resolveDbLogMode(process.env.DB_LOG)),
    maxQueryExecutionTime: resolveSlowQueryMs(process.env.DB_SLOW_QUERY_MS),
  };

  if (getDbType() === 'mysql') {
    return {
      ...common,
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'rustdesk_console',
      charset: 'utf8mb4',
    };
  }

  return {
    ...common,
    type: 'sqlite',
    database: getDbPath(),
  };
}
