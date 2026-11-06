import { Injectable } from '@nestjs/common';
import { RUNTIME_UNAVAILABLE } from './application.rules';

export interface DeployRequest {
  applicationId: string;
  organizationId: string;
  name: string;
  image: string;
  containerPort: number;
  cpuMillicores: number;
  memoryMb: number;
}

export interface PlatformRuntime {
  deploy(request: DeployRequest): Promise<void>;
}

export const PLATFORM_RUNTIME = Symbol('PLATFORM_RUNTIME');

@Injectable()
export class UnconfiguredRuntime implements PlatformRuntime {
  async deploy(_request: DeployRequest): Promise<void> {
    throw new Error(RUNTIME_UNAVAILABLE);
  }
}
