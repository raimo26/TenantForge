import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { OperationsController } from './operations.controller';
import { PLATFORM_RUNTIME, UnconfiguredRuntime } from './platform-runtime';

@Module({
  imports: [AuditModule],
  controllers: [ApplicationsController, OperationsController],
  providers: [
    ApplicationsService,
    {
      provide: PLATFORM_RUNTIME,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mode = config.get<string>('PLATFORM_RUNTIME') ?? 'none';
        if (mode === 'none') {
          return new UnconfiguredRuntime();
        }
        throw new Error(`Unsupported PLATFORM_RUNTIME=${mode}`);
      },
    },
  ],
})
export class ApplicationsModule {}
