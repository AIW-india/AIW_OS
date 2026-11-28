import { prisma } from '../../src/database/prisma.js';
import type { SeedOrgContext } from './organisation.js';
import type { SeedEmployeesResult } from './employees.js';
import type { SeedProjectsResult } from './projects.js';
import type { SeedMilestonesResult } from './milestones.js';

export async function seedTasksAndDocumentsData(
  ctx: SeedOrgContext,
  employees: SeedEmployeesResult,
  projects: SeedProjectsResult,
  milestones: SeedMilestonesResult,
): Promise<void> {
  const orgId = ctx.organisationId;
  const siteEngs = employees.byRole['SITE_ENGINEER'] || [ctx.superAdminUserId];
  const archs = employees.byRole['ARCHITECT_INTERIOR_DESIGNER'] || [ctx.superAdminUserId];

  const taskTemplates = [
    { title: 'Verify site laser measurements & electrical points', status: 'COMPLETED' as const, priority: 'HIGH' as const, dueOffset: -12 },
    { title: 'Finalize 2D working drawings & elevation sheets', status: 'COMPLETED' as const, priority: 'HIGH' as const, dueOffset: -8 },
    { title: 'Coordinate material delivery & site storage', status: 'IN_PROGRESS' as const, priority: 'URGENT' as const, dueOffset: 2 },
    { title: 'Complete false ceiling GI framing inspection', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, dueOffset: -2 }, // Overdue
    { title: 'Resolve plumbing shaft clearance with MEP team', status: 'BLOCKED' as const, priority: 'HIGH' as const, dueOffset: -1 }, // Overdue & Blocked
    { title: 'Schedule client walkthrough for laminate selection', status: 'TODO' as const, priority: 'MEDIUM' as const, dueOffset: 5 },
  ];

  const docTemplates = [
    { title: 'Architectural Floor Plan Rev 2', category: 'DRAWINGS' as const, fileName: 'floor-plan-rev2.pdf', mimeType: 'application/pdf' },
    { title: 'Client Sign-off & Material Approval', category: 'CLIENT_APPROVALS' as const, fileName: 'client-approval-signed.pdf', mimeType: 'application/pdf' },
    { title: 'Site Progress Photograph — Week 3', category: 'SITE_PHOTOGRAPHS' as const, fileName: 'site-progress-w3.jpg', mimeType: 'image/jpeg' },
    { title: 'Technical MEP Specification Sheet', category: 'TECHNICAL_SPECIFICATIONS' as const, fileName: 'mep-specs-v1.pdf', mimeType: 'application/pdf' },
  ];

  let projIdx = 0;
  for (const [projectCode, projectId] of Object.entries(projects.projectsByCode)) {
    const existingTasks = await prisma.projectTask.count({
      where: { organisationId: orgId, projectId },
    });

    if (existingTasks === 0) {
      const mIds = milestones.milestonesByProject[projectCode] || [];
      for (let i = 0; i < taskTemplates.length; i++) {
        const t = taskTemplates[i];
        const status = projectCode === 'PRJ-DEMO-004' ? 'COMPLETED' : t.status;
        const assigneeId = i % 2 === 0 ? siteEngs[(projIdx + i) % siteEngs.length] : archs[(projIdx + i) % archs.length];

        const task = await prisma.projectTask.create({
          data: {
            organisationId: orgId,
            projectId,
            milestoneId: mIds[i % Math.max(mIds.length, 1)] ?? null,
            title: t.title,
            description: `${t.title} for ${projectCode}`,
            status,
            priority: t.priority,
            assigneeUserId: assigneeId,
            startDate: new Date(Date.now() - 15 * 86400000),
            dueDate: new Date(Date.now() + t.dueOffset * 86400000),
            completedAt: status === 'COMPLETED' ? new Date(Date.now() - 3 * 86400000) : null,
            createdByUserId: ctx.superAdminUserId,
          },
        });

        if (i === 0 || i === 2) {
          await prisma.projectTaskComment.create({
            data: {
              taskId: task.id,
              authorUserId: assigneeId,
              content: i === 0 ? 'Verified on site and signed off.' : 'In progress — awaiting vendor confirmation.',
            },
          });
        }
      }
    }

    const existingDocs = await prisma.projectDocument.count({
      where: { organisationId: orgId, projectId },
    });

    if (existingDocs === 0) {
      for (const d of docTemplates) {
        await prisma.projectDocument.create({
          data: {
            organisationId: orgId,
            projectId,
            title: d.title,
            category: d.category,
            fileName: d.fileName,
            fileSize: 102400,
            mimeType: d.mimeType,
            fileUrl: `/api/v1/projects/${projectId}/documents/private/${d.fileName}`,
            uploadedByUserId: ctx.superAdminUserId,
          },
        });
      }
    }

    projIdx++;
  }
}
