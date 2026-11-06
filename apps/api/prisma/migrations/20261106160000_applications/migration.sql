-- CreateEnum
CREATE TYPE "ApplicationDesiredState" AS ENUM ('RUNNING', 'STOPPED');

-- CreateEnum
CREATE TYPE "ApplicationRuntimeStatus" AS ENUM ('CREATED', 'DEPLOYING', 'RUNNING', 'FAILED', 'STOPPED', 'DELETING');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('DEPLOY');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogStream" AS ENUM ('PLATFORM', 'STDOUT', 'STDERR');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "containerPort" INTEGER NOT NULL,
    "cpuMillicores" INTEGER NOT NULL DEFAULT 100,
    "memoryMb" INTEGER NOT NULL DEFAULT 128,
    "desiredState" "ApplicationDesiredState" NOT NULL DEFAULT 'STOPPED',
    "runtimeStatus" "ApplicationRuntimeStatus" NOT NULL DEFAULT 'CREATED',
    "statusMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "OperationType" NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "operationId" TEXT,
    "stream" "LogStream" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_organizationId_createdAt_idx" ON "Application"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_organizationId_name_key" ON "Application"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Operation_organizationId_createdAt_idx" ON "Operation"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Operation_applicationId_createdAt_idx" ON "Operation"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationLog_applicationId_createdAt_idx" ON "ApplicationLog"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationLog" ADD CONSTRAINT "ApplicationLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationLog" ADD CONSTRAINT "ApplicationLog_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
