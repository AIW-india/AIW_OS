import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';

const router = Router();

// CRM Dashboard metrics
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.reports.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;

      const [
        totalLeads,
        openLeads,
        wonLeads,
        lostLeads,
        archivedLeads,
        totalCustomers,
        overdueFollowUps,
        pendingFollowUps,
        scheduledSiteVisits,
        leadsByPriority,
        leadsByStage,
        leadsBySource,
        recentLeads,
      ] = await Promise.all([
        prisma.lead.count({ where: { organisationId: orgId } }),
        prisma.lead.count({ where: { organisationId: orgId, status: 'OPEN' } }),
        prisma.lead.count({ where: { organisationId: orgId, status: 'WON' } }),
        prisma.lead.count({ where: { organisationId: orgId, status: 'LOST' } }),
        prisma.lead.count({ where: { organisationId: orgId, status: 'ARCHIVED' } }),
        prisma.customer.count({ where: { organisationId: orgId } }),
        prisma.followUp.count({
          where: {
            organisationId: orgId,
            status: 'PENDING',
            scheduledAt: { lt: new Date() },
          },
        }),
        prisma.followUp.count({
          where: { organisationId: orgId, status: 'PENDING' },
        }),
        prisma.siteVisit.count({
          where: { organisationId: orgId, status: 'SCHEDULED' },
        }),
        prisma.lead.groupBy({
          by: ['priority'],
          where: { organisationId: orgId, status: 'OPEN' },
          _count: { _all: true },
        }),
        prisma.lead.groupBy({
          by: ['pipelineStageId'],
          where: { organisationId: orgId, status: 'OPEN' },
          _count: { _all: true },
        }),
        prisma.lead.groupBy({
          by: ['sourceId'],
          where: { organisationId: orgId },
          _count: { _all: true },
        }),
        prisma.lead.findMany({
          where: { organisationId: orgId },
          select: {
            id: true,
            leadNumber: true,
            customerName: true,
            priority: true,
            status: true,
            createdAt: true,
            pipelineStage: { select: { name: true, color: true } },
            assignedUser: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      // Enrich stage names
      const stageIds = leadsByStage.map((s) => s.pipelineStageId).filter(Boolean) as string[];
      const stages = stageIds.length > 0
        ? await prisma.leadPipelineStage.findMany({
            where: { id: { in: stageIds } },
            select: { id: true, name: true, color: true, order: true },
          })
        : [];
      const stageMap = new Map(stages.map((s) => [s.id, s]));

      const leadsByStageEnriched = leadsByStage.map((entry) => ({
        stageId: entry.pipelineStageId,
        stageName: stageMap.get(entry.pipelineStageId ?? '')?.name ?? 'Unassigned',
        stageColor: stageMap.get(entry.pipelineStageId ?? '')?.color ?? null,
        order: stageMap.get(entry.pipelineStageId ?? '')?.order ?? 999,
        count: entry._count._all,
      })).sort((a, b) => a.order - b.order);

      // Enrich source names
      const sourceIds = leadsBySource.map((s) => s.sourceId).filter(Boolean) as string[];
      const sources = sourceIds.length > 0
        ? await prisma.leadSource.findMany({
            where: { id: { in: sourceIds } },
            select: { id: true, name: true },
          })
        : [];
      const sourceMap = new Map(sources.map((s) => [s.id, s.name]));

      const leadsBySourceEnriched = leadsBySource.map((entry) => ({
        sourceId: entry.sourceId,
        sourceName: sourceMap.get(entry.sourceId ?? '') ?? 'Unknown',
        count: entry._count._all,
      }));

      // Conversion rate
      const conversionRate = totalLeads > 0
        ? Math.round((wonLeads / totalLeads) * 10000) / 100
        : 0;

      res.status(200).json({
        data: {
          summary: {
            totalLeads,
            openLeads,
            wonLeads,
            lostLeads,
            archivedLeads,
            totalCustomers,
            conversionRate,
            overdueFollowUps,
            pendingFollowUps,
            scheduledSiteVisits,
          },
          leadsByPriority: leadsByPriority.map((p) => ({
            priority: p.priority,
            count: p._count._all,
          })),
          leadsByStage: leadsByStageEnriched,
          leadsBySource: leadsBySourceEnriched,
          recentLeads,
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

export const dashboardRoutes = router;
