'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  ErrorAlert,
  PageHeader,
  PageSkeleton,
  StatusBadge,
} from '@tenantforge/ui';

interface Application {
  id: string;
  name: string;
  image: string;
  containerPort: number;
  cpuMillicores: number;
  memoryMb: number;
  desiredState: string;
  runtimeStatus: string;
  statusMessage: string | null;
}

interface LogLine {
  id: string;
  stream: string;
  message: string;
  operationId: string | null;
  createdAt: string;
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken, activeOrgId } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(accessToken && activeOrgId && params.id);

  const applicationQuery = useQuery({
    queryKey: ['application', params.id, activeOrgId],
    queryFn: () =>
      apiRequest<Application>(`/applications/${params.id}`, {
        token: accessToken,
        orgId: activeOrgId ?? undefined,
      }),
    enabled,
    refetchInterval: (query) => (query.state.data?.runtimeStatus === 'DEPLOYING' ? 2000 : false),
  });

  const logsQuery = useQuery({
    queryKey: ['application-logs', params.id, activeOrgId],
    queryFn: () =>
      apiRequest<{ data: LogLine[] }>(`/applications/${params.id}/logs`, {
        token: accessToken,
        orgId: activeOrgId ?? undefined,
      }),
    enabled,
    refetchInterval: applicationQuery.data?.runtimeStatus === 'DEPLOYING' ? 2000 : false,
  });

  const deploy = useMutation({
    mutationFn: () =>
      apiRequest<{ operationId: string }>(`/applications/${params.id}/deploy`, {
        method: 'POST',
        token: accessToken,
        orgId: activeOrgId ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', params.id, activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ['application-logs', params.id, activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ['applications', activeOrgId] });
    },
  });

  if (applicationQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (applicationQuery.isError || !applicationQuery.data) {
    return <ErrorAlert message="Failed to load this application." />;
  }

  const application = applicationQuery.data;
  const deployError = deploy.error instanceof ApiClientError ? deploy.error.message : null;
  const deploying = application.runtimeStatus === 'DEPLOYING' || deploy.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={application.name}
        description={application.image}
        action={<StatusBadge status={application.runtimeStatus} />}
      />

      <p className="text-sm">
        <Link href="/applications" className="text-blue-700 hover:underline">
          Back to applications
        </Link>
      </p>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Runtime</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>Port {application.containerPort}</p>
          <p>
            {application.cpuMillicores} millicores, {application.memoryMb} MB memory
          </p>
          <p>Desired state {application.desiredState.toLowerCase()}</p>
          {application.statusMessage && <p>{application.statusMessage}</p>}
          <Button type="button" onClick={() => deploy.mutate()} disabled={deploying}>
            {deploying ? 'Deploying...' : 'Deploy'}
          </Button>
          {deployError && <ErrorAlert message={deployError} title="Deploy was not accepted" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Logs</h2>
        </CardHeader>
        <CardContent>
          {logsQuery.isError && <ErrorAlert message="Failed to load logs." />}
          {!logsQuery.isError && (logsQuery.data?.data.length ?? 0) === 0 && (
            <p className="text-sm text-slate-600">No log lines yet.</p>
          )}
          <ul className="space-y-2">
            {logsQuery.data?.data.map((line) => (
              <li key={line.id} className="font-mono text-xs text-slate-800">
                <span className="text-slate-500">{line.stream.toLowerCase()}</span> {line.message}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
