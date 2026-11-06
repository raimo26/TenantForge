export const DEFAULT_CPU_MILLICORES = 100;
export const DEFAULT_MEMORY_MB = 128;
export const LOG_PAGE_SIZE = 200;

export const RUNTIME_UNAVAILABLE =
  'No container runtime is configured. Connect a Kubernetes cluster before an image can be pulled and started.';

export function deployConflict(status: string): string | null {
  if (status === 'DEPLOYING') {
    return 'Application is already deploying';
  }
  if (status === 'DELETING') {
    return 'Application is being deleted';
  }
  return null;
}
