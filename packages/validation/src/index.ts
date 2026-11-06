import { z } from 'zod';

export const membershipRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const subscriptionStatusSchema = z.enum([
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'INCOMPLETE',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(100),
    organizationName: z.string().min(1).max(100).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export const createOrganizationSchema = z
  .object({
    name: z.string().min(1).max(100),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  })
  .strict();

export const updateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
  })
  .strict();

export const inviteMemberSchema = z
  .object({
    email: z.string().email(),
    role: membershipRoleSchema.exclude(['OWNER']),
  })
  .strict();

export const updateMemberRoleSchema = z
  .object({
    role: membershipRoleSchema.exclude(['OWNER']),
  })
  .strict();

export const createProjectSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .strict();

export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(300),
    description: z.string().max(5000).optional(),
    assigneeId: z.string().cuid().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(5000).optional(),
    assigneeId: z.string().cuid().nullable().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  })
  .strict();

export const createCommentSchema = z
  .object({
    content: z.string().min(1).max(5000),
  })
  .strict();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const IMAGE_TAG = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
const IMAGE_DIGEST = /^sha256:[a-f0-9]{64}$/;
const IMAGE_NAME = /^[a-z0-9]+(?:(?:[._]|__|[-]*)[a-z0-9]+)*$/;
const REGISTRY_HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

function isRegistryHost(value: string): boolean {
  const parts = value.split(':');
  if (parts.length > 2) {
    return false;
  }
  const host = parts[0] ?? '';
  const port = parts[1];
  if (!REGISTRY_HOST.test(host)) {
    return false;
  }
  if (port === undefined) {
    return true;
  }
  if (!/^[0-9]{1,5}$/.test(port)) {
    return false;
  }
  const portNumber = Number(port);
  return portNumber >= 1 && portNumber <= 65535;
}

/** Public OCI reference with an explicit tag or sha256 digest. No embedded credentials. */
export function isPublicImageReference(input: string): boolean {
  if (input.length < 1 || input.length > 512) {
    return false;
  }
  if (/\s/.test(input) || input.includes('://') || input.includes('\\')) {
    return false;
  }

  let name = input;
  let hasReference = false;
  const at = input.lastIndexOf('@');
  if (at !== -1) {
    if (!IMAGE_DIGEST.test(input.slice(at + 1))) {
      return false;
    }
    name = input.slice(0, at);
    hasReference = true;
  } else {
    const slash = name.lastIndexOf('/');
    const colon = name.lastIndexOf(':');
    if (colon > slash) {
      if (!IMAGE_TAG.test(name.slice(colon + 1))) {
        return false;
      }
      name = name.slice(0, colon);
      hasReference = true;
    }
  }

  if (!hasReference || name.length === 0 || name.startsWith('/') || name.endsWith('/')) {
    return false;
  }

  const parts = name.split('/');
  if (parts.some((part) => part.length === 0)) {
    return false;
  }

  const first = parts[0] ?? '';
  let repository = parts;
  if (first.includes('.') || first.includes(':') || first === 'localhost') {
    if (!isRegistryHost(first) || parts.length < 2) {
      return false;
    }
    repository = parts.slice(1);
  }

  return repository.every((part) => IMAGE_NAME.test(part));
}

export const applicationNameSchema = z
  .string()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/,
    'Name must be a lowercase DNS label of 1–40 characters',
  );

export const createApplicationSchema = z
  .object({
    name: applicationNameSchema,
    image: z.string().refine(isPublicImageReference, {
      message: 'Image must be a public reference with an explicit tag or sha256 digest',
    }),
    containerPort: z.number().int().min(1).max(65535),
  })
  .strict();

export const checkoutSessionSchema = z
  .object({
    priceId: z.string().min(1),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
