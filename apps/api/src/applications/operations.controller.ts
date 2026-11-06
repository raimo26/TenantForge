import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentOrg } from '../common/decorators/tenant.decorators';
import { JwtAuthGuard, RolesGuard, TenantGuard } from '../common/guards/tenant.guards';
import { ApplicationsService } from './applications.service';

@ApiTags('operations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true })
@UseGuards(AuthGuard('jwt'), JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get one operation in the active organization' })
  getById(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.applicationsService.getOperation(orgId, id);
  }
}
