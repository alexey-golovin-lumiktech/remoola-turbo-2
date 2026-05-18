import { Injectable } from '@nestjs/common';

import {
  ACTIVE_VERIFICATION_STATUSES,
  hasMissingProfileData,
  normalizeActiveStatuses,
  normalizePage,
} from './admin-v2-verification-policy';
import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';
import { AdminV2VerificationQuery } from './admin-v2-verification.query';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

type VerificationQueueFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
};

@Injectable()
export class AdminV2VerificationQueueService {
  constructor(
    private readonly query: AdminV2VerificationQuery,
    private readonly slaService: AdminV2VerificationSlaService,
    private readonly assignmentsService: AdminV2AssignmentsService,
  ) {}

  async getQueue(params?: VerificationQueueFilters) {
    const pagination = normalizePage(params?.page, params?.pageSize);
    const statuses = normalizeActiveStatuses(params?.status);
    const stripeIdentityStatus = params?.stripeIdentityStatus?.trim() || undefined;
    const contractorKind = params?.contractorKind?.trim() || undefined;
    const country = params?.country?.trim() || undefined;

    const [rows, slaSnapshot] = await Promise.all([
      this.query.getQueueRows({ statuses, stripeIdentityStatus, contractorKind, country }),
      this.slaService.getSnapshot(),
    ]);

    const filtered = rows.filter((item) => {
      const missingProfileData = hasMissingProfileData(item);
      const missingDocuments = item._count.consumerResources === 0;
      if (params?.missingProfileData === true && !missingProfileData) return false;
      if (params?.missingDocuments === true && !missingDocuments) return false;
      return true;
    });
    const queueBreachedCount = filtered.filter((item) => slaSnapshot.breachedConsumerIds.has(item.id)).length;

    const pageSlice = filtered.slice(pagination.skip, pagination.skip + pagination.pageSize);
    const assigneesByResourceId = await this.assignmentsService.getActiveAssigneesForResource(
      `verification`,
      pageSlice.map((item) => item.id),
    );

    const items = pageSlice.map((item) => ({
      id: item.id,
      email: item.email,
      accountType: item.accountType,
      contractorKind: item.contractorKind,
      verificationStatus: item.verificationStatus,
      stripeIdentityStatus: item.stripeIdentityStatus,
      country: item.addressDetails?.country ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      verificationUpdatedAt: item.verificationUpdatedAt,
      missingProfileData: hasMissingProfileData(item),
      missingDocuments: item._count.consumerResources === 0,
      documentsCount: item._count.consumerResources,
      slaBreached: slaSnapshot.breachedConsumerIds.has(item.id),
      assignedTo: assigneesByResourceId.get(item.id) ?? null,
    }));

    return {
      items,
      total: filtered.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      activeStatuses: [...ACTIVE_VERIFICATION_STATUSES],
      sla: {
        breachedCount: queueBreachedCount,
        thresholdHours: slaSnapshot.thresholdHours,
        lastComputedAt: slaSnapshot.lastComputedAt,
      },
    };
  }

  async getQueueCount(filters?: VerificationQueueFilters): Promise<number> {
    const statuses = normalizeActiveStatuses(filters?.status);
    const stripeIdentityStatus = filters?.stripeIdentityStatus?.trim() || undefined;
    const contractorKind = filters?.contractorKind?.trim() || undefined;
    const country = filters?.country?.trim() || undefined;

    if (filters?.missingProfileData === true || filters?.missingDocuments === true) {
      const rows = await this.query.getQueueCountRows({ statuses, stripeIdentityStatus, contractorKind, country });

      return rows.filter((item) => {
        const missingProfileData = hasMissingProfileData(item);
        const missingDocuments = item._count.consumerResources === 0;
        if (filters.missingProfileData === true && !missingProfileData) return false;
        if (filters.missingDocuments === true && !missingDocuments) return false;
        return true;
      }).length;
    }

    return this.query.countQueue({ statuses, stripeIdentityStatus, contractorKind, country });
  }
}
