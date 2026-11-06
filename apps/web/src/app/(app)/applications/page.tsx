'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorAlert,
  Input,
  PageHeader,
  PageSkeleton,
  StatusBadge,
} from '@tenantforge/ui';

interface Application {
  id: string;
  name: string;
  image: string;
  containerPort: number;
  runtimeStatus: string;
}

interface ApplicationPage {
  data: Application[];
  meta: { total: number };
}

export default function ApplicationsPage() {
  const { accessToken, activeOrgId } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [image, setImage] = useState('docker.io/library/nginx:1.27');
  const [containerPort, setContainerPort] = useState('80');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', activeOrgId],
    queryFn: () =>
      apiRequest<ApplicationPage>('/applications?page=1&limit=50', {
        token: accessToken,
        orgId: activeOrgId ?? undefined,
      }),
    enabled: Boolean(accessToken && activeOrgId),
  });

  const createApplication = useMutation({
    mutationFn: (body: { name: string; image: string; containerPort: number }) =>
      apiRequest<Application>('/applications', {
        method: 'POST',
        body,
        token: accessToken,
        orgId: activeOrgId ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', activeOrgId] });
      setName('');
    },
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createApplication.mutate({
      name,
      image,
      containerPort: Number(containerPort),
    });
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  const createError =
    createApplication.error instanceof ApiClientError ? createApplication.error.message : null;
  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description={`${total} ${total === 1 ? 'application' : 'applications'} in this organization`}
      />

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Create application</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use a public image with an explicit tag. Deploy records the request. A cluster is
            required before the container can start.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
            <Input
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
              title="Lowercase DNS label, 1–40 characters"
              className="min-w-[140px] flex-1"
            />
            <Input
              placeholder="docker.io/library/nginx:1.27"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              required
              className="min-w-[240px] flex-[2]"
            />
            <Input
              type="number"
              min={1}
              max={65535}
              value={containerPort}
              onChange={(event) => setContainerPort(event.target.value)}
              required
              aria-label="Container port"
              className="w-28"
            />
            <Button type="submit" disabled={createApplication.isPending}>
              {createApplication.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
          {createError && (
            <div className="mt-3">
              <ErrorAlert message={createError} title="Could not create application" />
            </div>
          )}
        </CardContent>
      </Card>

      {isError && <ErrorAlert message="Failed to load applications." />}

      {!isError && data?.data.length === 0 && (
        <EmptyState
          title="No applications yet"
          description="Create one from a public image such as docker.io/library/nginx:1.27."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.data.map((application) => (
          <Link key={application.id} href={`/applications/${application.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{application.name}</h3>
                  <StatusBadge status={application.runtimeStatus} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="truncate text-sm text-slate-600">{application.image}</p>
                <p className="mt-2 text-xs text-slate-500">Port {application.containerPort}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
