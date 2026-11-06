import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { AuthUser } from '../auth/types/request-with-user';
import {
  CurrentOrg,
  CurrentUser,
  RequireRole,
} from '../common/decorators/tenant.decorators';
import { CreateApplicationDto, PaginationDto } from '../common/dto/validation.dto';
import { JwtAuthGuard, RolesGuard, TenantGuard } from '../common/guards/tenant.guards';
import { paginate } from '../common/utils/pagination';
import { ApplicationsService } from './applications.service';

@ApiTags('applications')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true })
@UseGuards(AuthGuard('jwt'), JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List applications in the active organization' })
  async list(@CurrentOrg() orgId: string, @Query() query: PaginationDto) {
    const { data, total } = await this.applicationsService.list(orgId, query.page, query.limit);
    return paginate(data, total, query.page, query.limit);
  }

  @Post()
  @RequireRole(MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER)
  @ApiOperation({ summary: 'Create an application from a public image' })
  create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(orgId, user.id, dto);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Read the latest application logs' })
  logs(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.applicationsService.logs(orgId, id);
  }

  @Post(':id/deploy')
  @HttpCode(202)
  @RequireRole(MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER)
  @ApiOperation({ summary: 'Request a deploy' })
  deploy(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.applicationsService.deploy(orgId, user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one application' })
  getById(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.applicationsService.getById(orgId, id);
  }
}
