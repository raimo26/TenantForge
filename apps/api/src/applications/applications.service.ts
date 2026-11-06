import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationDesiredState,
  ApplicationRuntimeStatus,
  LogStream,
  OperationStatus,
  OperationType,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CreateApplicationDto } from '../common/dto/validation.dto';
import { PrismaService } from '../prisma/prisma.module';
import {
  DEFAULT_CPU_MILLICORES,
  DEFAULT_MEMORY_MB,
  LOG_PAGE_SIZE,
  deployConflict,
} from './application.rules';
import { PLATFORM_RUNTIME, PlatformRuntime } from './platform-runtime';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(PLATFORM_RUNTIME) private readonly runtime: PlatformRuntime,
  ) {}

  async list(orgId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { organizationId: orgId };
    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.application.count({ where }),
    ]);
    return { data, total };
  }

  async getById(orgId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId: orgId },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  async create(orgId: string, userId: string, dto: CreateApplicationDto) {
    try {
      const application = await this.prisma.application.create({
        data: {
          organizationId: orgId,
          name: dto.name,
          image: dto.image,
          containerPort: dto.containerPort,
          cpuMillicores: DEFAULT_CPU_MILLICORES,
          memoryMb: DEFAULT_MEMORY_MB,
          desiredState: ApplicationDesiredState.STOPPED,
          runtimeStatus: ApplicationRuntimeStatus.CREATED,
        },
      });

      await this.auditService.log({
        organizationId: orgId,
        actorId: userId,
        action: 'application.created',
        entityType: 'Application',
        entityId: application.id,
        metadata: {
          name: application.name,
          image: application.image,
          containerPort: application.containerPort,
        },
      });

      return application;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An application with this name already exists');
      }
      throw error;
    }
  }

  async deploy(orgId: string, userId: string, applicationId: string) {
    const application = await this.getById(orgId, applicationId);
    const conflict = deployConflict(application.runtimeStatus);
    if (conflict) {
      throw new ConflictException(conflict);
    }

    const operation = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.application.updateMany({
        where: {
          id: applicationId,
          organizationId: orgId,
          runtimeStatus: {
            notIn: [ApplicationRuntimeStatus.DEPLOYING, ApplicationRuntimeStatus.DELETING],
          },
        },
        data: {
          runtimeStatus: ApplicationRuntimeStatus.DEPLOYING,
          desiredState: ApplicationDesiredState.RUNNING,
          statusMessage: null,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Application is already deploying');
      }

      const created = await tx.operation.create({
        data: {
          organizationId: orgId,
          applicationId,
          actorId: userId,
          type: OperationType.DEPLOY,
          status: OperationStatus.PENDING,
        },
      });

      await tx.applicationLog.create({
        data: {
          applicationId,
          operationId: created.id,
          stream: LogStream.PLATFORM,
          message: `Deploy requested for ${application.image} on port ${application.containerPort}.`,
        },
      });

      return created;
    });

    this.schedule(operation.id);

    await this.auditService.log({
      organizationId: orgId,
      actorId: userId,
      action: 'application.deploy_requested',
      entityType: 'Application',
      entityId: applicationId,
      metadata: { operationId: operation.id, image: application.image },
    });

    return { operationId: operation.id };
  }

  async logs(orgId: string, applicationId: string) {
    await this.getById(orgId, applicationId);
    const rows = await this.prisma.applicationLog.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      take: LOG_PAGE_SIZE,
      select: {
        id: true,
        stream: true,
        message: true,
        operationId: true,
        createdAt: true,
      },
    });
    return { data: rows.reverse() };
  }

  async getOperation(orgId: string, operationId: string) {
    const operation = await this.prisma.operation.findFirst({
      where: { id: operationId, organizationId: orgId },
    });
    if (!operation) {
      throw new NotFoundException('Operation not found');
    }
    return operation;
  }

  private schedule(operationId: string): void {
    setImmediate(() => {
      void this.finishDeploy(operationId).catch((error: unknown) => {
        const detail = error instanceof Error ? error.stack : String(error);
        this.logger.error(`Deploy operation ${operationId} did not finish`, detail);
      });
    });
  }

  private async finishDeploy(operationId: string): Promise<void> {
    const operation = await this.prisma.operation.findUnique({
      where: { id: operationId },
      include: { application: true },
    });
    if (!operation) {
      return;
    }

    await this.prisma.operation.update({
      where: { id: operationId },
      data: { status: OperationStatus.RUNNING, startedAt: new Date() },
    });
    await this.writeLog(operation.applicationId, operationId, 'Deploy started.');

    try {
      await this.runtime.deploy({
        applicationId: operation.applicationId,
        organizationId: operation.organizationId,
        name: operation.application.name,
        image: operation.application.image,
        containerPort: operation.application.containerPort,
        cpuMillicores: operation.application.cpuMillicores,
        memoryMb: operation.application.memoryMb,
      });

      await this.prisma.$transaction([
        this.prisma.operation.update({
          where: { id: operationId },
          data: { status: OperationStatus.COMPLETED, finishedAt: new Date(), error: null },
        }),
        this.prisma.application.update({
          where: { id: operation.applicationId },
          data: { runtimeStatus: ApplicationRuntimeStatus.RUNNING, statusMessage: null },
        }),
      ]);
      await this.writeLog(
        operation.applicationId,
        operationId,
        'Deploy completed. Container is running.',
      );
      await this.auditService.log({
        organizationId: operation.organizationId,
        actorId: operation.actorId ?? undefined,
        action: 'application.deployed',
        entityType: 'Application',
        entityId: operation.applicationId,
        metadata: { operationId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deploy failed';
      await this.prisma.$transaction([
        this.prisma.operation.update({
          where: { id: operationId },
          data: { status: OperationStatus.FAILED, finishedAt: new Date(), error: message },
        }),
        this.prisma.application.update({
          where: { id: operation.applicationId },
          data: {
            runtimeStatus: ApplicationRuntimeStatus.FAILED,
            statusMessage: message,
          },
        }),
      ]);
      await this.writeLog(operation.applicationId, operationId, `Deploy failed: ${message}`);
      await this.auditService.log({
        organizationId: operation.organizationId,
        actorId: operation.actorId ?? undefined,
        action: 'application.deploy_failed',
        entityType: 'Application',
        entityId: operation.applicationId,
        metadata: { operationId, error: message },
      });
    }
  }

  private writeLog(applicationId: string, operationId: string, message: string) {
    return this.prisma.applicationLog.create({
      data: {
        applicationId,
        operationId,
        stream: LogStream.PLATFORM,
        message,
      },
    });
  }
}
