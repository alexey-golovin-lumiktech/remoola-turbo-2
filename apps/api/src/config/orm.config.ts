import { type TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';

import { parsedEnvs } from '@remoola/env';

import { SnakeNamingStrategy } from './naming.strategy';

export const ormConfig: TypeOrmModuleAsyncOptions = {
  useFactory: () => ({
    type: `postgres`,
    url: parsedEnvs.DATABASE_URL,
    ssl: parsedEnvs.POSTGRES_SSL == `true` ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    entities: [__dirname + `/../**/*.entity.{ts,js}`],
    migrations: [__dirname + `/../database/migrations/*.{ts,js}`],
    synchronize: false,
    logging: false,
    extra: { options: `-c timezone=${parsedEnvs.POSTGRES_TIMEZONE}` },
    namingStrategy: new SnakeNamingStrategy(),
  }),
  dataSourceFactory: (options: DataSourceOptions) => {
    const dataSource = new DataSource(options);
    return dataSource.initialize();
  },
};
