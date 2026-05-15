import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AssignmentsController } from './admin-v2-assignments.controller';
import { AdminV2AssignmentsQuery } from './admin-v2-assignments.query';
import { AdminV2AssignmentsRepository } from './admin-v2-assignments.repository';
import { AdminV2AssignmentsService } from './admin-v2-assignments.service';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2AssignmentsController],
  providers: [AdminV2AssignmentsService, AdminV2AssignmentsQuery, AdminV2AssignmentsRepository],
  exports: [AdminV2AssignmentsService],
})
export class AdminV2AssignmentsModule {}
