import { cn } from '../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusMap: Record<string, BadgeVariant> = {
  TODO: 'neutral',
  IN_PROGRESS: 'default',
  DONE: 'success',
  ACTIVE: 'success',
  TRIALING: 'warning',
  PAST_DUE: 'danger',
  CANCELED: 'neutral',
  INCOMPLETE: 'neutral',
  OWNER: 'default',
  ADMIN: 'warning',
  MEMBER: 'success',
  VIEWER: 'neutral',
  CREATED: 'neutral',
  DEPLOYING: 'default',
  RUNNING: 'success',
  FAILED: 'danger',
  STOPPED: 'neutral',
  DELETING: 'warning',
  PENDING: 'warning',
  COMPLETED: 'success',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = statusMap[status] ?? 'neutral';
  const label = status.replace(/_/g, ' ').toLowerCase();
  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {label}
    </Badge>
  );
}
