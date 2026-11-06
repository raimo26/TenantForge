import { createZodDto } from 'nestjs-zod';
import {
  checkoutSessionSchema,
  createApplicationSchema,
  createCommentSchema,
  createOrganizationSchema,
  createProjectSchema,
  createTaskSchema,
  inviteMemberSchema,
  loginSchema,
  paginationSchema,
  refreshTokenSchema,
  registerSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  updateProjectSchema,
  updateTaskSchema,
} from '@tenantforge/validation';

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
export class CreateOrganizationDto extends createZodDto(createOrganizationSchema) {}
export class UpdateOrganizationDto extends createZodDto(updateOrganizationSchema) {}
export class InviteMemberDto extends createZodDto(inviteMemberSchema) {}
export class UpdateMemberRoleDto extends createZodDto(updateMemberRoleSchema) {}
export class CreateProjectDto extends createZodDto(createProjectSchema) {}
export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class CreateCommentDto extends createZodDto(createCommentSchema) {}
export class CreateApplicationDto extends createZodDto(createApplicationSchema) {}
export class PaginationDto extends createZodDto(paginationSchema) {}
export class CheckoutSessionDto extends createZodDto(checkoutSessionSchema) {}
