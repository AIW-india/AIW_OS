import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export interface AuditEventInput {
  organisationId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string;
  ipAddress?: string | null;
  metadataJson?: Prisma.InputJsonValue;
  beforeJson?: Prisma.InputJsonValue;
  afterJson?: Prisma.InputJsonValue;
}

/**
 * Records an immutable audit event in the database.
 * Never store passwords, tokens, or secrets in metadata/before/after JSON.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organisationId: input.organisationId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        requestId: input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
        metadataJson: input.metadataJson ?? undefined,
        beforeJson: input.beforeJson ?? undefined,
        afterJson: input.afterJson ?? undefined,
      },
    });
  } catch (err) {
    console.error('[AuditService] Failed to record audit event:', err);
  }
}
