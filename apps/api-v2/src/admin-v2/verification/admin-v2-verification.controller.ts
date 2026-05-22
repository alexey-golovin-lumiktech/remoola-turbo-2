import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  AdminV2ReadThrottle,
  Identity,
  type IIdentityContext,
  PlainObjectResponseContract,
  RequestMeta,
  type RequestMeta as RequestMetaPayload,
} from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { VerificationDecisionBody, VerificationQueueWithPagingQuery } from './admin-v2-verification.dto';
import { AdminV2VerificationService } from './admin-v2-verification.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Verification`)
@PlainObjectResponseContract(
  `Admin v2 verification routes return plain objects governed by @remoola/api-types contracts.`,
)
@AdminV2ReadThrottle()
@Controller(`admin-v2/verification`)
export class AdminV2VerificationController {
  constructor(
    private readonly service: AdminV2VerificationService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`queue`)
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiQuery({ name: `status`, required: false })
  @ApiQuery({ name: `stripeIdentityStatus`, required: false })
  @ApiQuery({ name: `country`, required: false })
  @ApiQuery({ name: `contractorKind`, required: false })
  @ApiQuery({ name: `missingProfileData`, required: false, type: Boolean })
  @ApiQuery({ name: `missingDocuments`, required: false, type: Boolean })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async getQueue(@Identity() admin: IIdentityContext, @Query() query: VerificationQueueWithPagingQuery) {
    await this.accessService.assertCapability(admin, `verification.read`);
    return this.service.getQueue({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      stripeIdentityStatus: query.stripeIdentityStatus,
      country: query.country,
      contractorKind: query.contractorKind,
      missingProfileData: query.missingProfileData === true,
      missingDocuments: query.missingDocuments === true,
    });
  }

  @Get(`:consumerId`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id.` })
  async getCase(@Identity() admin: IIdentityContext, @Param(`consumerId`, ParseUUIDPipe) consumerId: string) {
    const profile = await this.accessService.assertCapability(admin, `verification.read`);
    const canManageAssignments = profile.capabilities.includes(`assignments.manage`);
    return this.service.getCase(consumerId, {
      canForceLogout: profile.capabilities.includes(`consumers.force_logout`),
      canDecide: profile.capabilities.includes(`verification.decide`),
      allowedActions: profile.capabilities.filter(
        (capability) => capability === `verification.decide` || capability === `consumers.force_logout`,
      ),
      canManageAssignments,
      canReassignAssignments: canManageAssignments && profile.role === `SUPER_ADMIN`,
    });
  }

  @Post(`:consumerId/approve`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async approve(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `approve`, body, meta);
  }

  @Post(`:consumerId/reject`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async reject(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `reject`, body, meta);
  }

  @Post(`:consumerId/request-info`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async requestInfo(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `request-info`, body, meta);
  }

  @Post(`:consumerId/flag`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async flag(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `flag`, body, meta);
  }
}
