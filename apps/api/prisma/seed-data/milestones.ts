import { prisma } from '../../src/database/prisma.js';
import type { SeedOrgContext } from './organisation.js';
import type { SeedProjectsResult } from './projects.js';

export interface SeedMilestonesResult {
  milestonesByProject: Record<string, string[]>;
}

const STANDARD_PHASES = [
  { name: 'Initial Planning & Site Handover', weight: 10 },
  { name: 'Design & Working Drawings', weight: 15 },
  { name: 'Client Approval & Sign-off', weight: 10 },
  { name: 'Procurement Preparation', weight: 15 },
  { name: 'Site Preparation & Civil', weight: 15 },
  { name: 'Core Execution', weight: 20 },
  { name: 'Quality Inspection', weight: 10 },
  { name: 'Final Handover', weight: 5 },
];

export async function seedMilestonesData(
  ctx: SeedOrgContext,
  projects: SeedProjectsResult,
): Promise<SeedMilestonesResult> {
  const orgId = ctx.organisationId;

  // 1. Ensure 2 reusable Milestone Templates
  const templates = [
    {
      name: 'Standard Interior Execution Phases',
      projectCategory: 'RESIDENTIAL_INTERIOR' as const,
      description: '8-phase standard residential interior execution workflow',
    },
    {
      name: 'Turnkey & Construction Phases',
      projectCategory: 'RESIDENTIAL_CONSTRUCTION' as const,
      description: '8-phase end-to-end civil & finishing workflow',
    },
  ];

  for (const t of templates) {
    const existing = await prisma.projectMilestoneTemplate.findFirst({
      where: { organisationId: orgId, name: t.name },
    });
    if (!existing) {
      await prisma.projectMilestoneTemplate.create({
        data: {
          organisationId: orgId,
          name: t.name,
          projectCategory: t.projectCategory,
          description: t.description,
          templateData: STANDARD_PHASES.map((p, idx) => ({
            name: p.name,
            sequenceOrder: idx + 1,
            defaultTasks: [`Complete ${p.name}`],
          })),
        },
      });
    }
  }

  // 2. Seed Milestones for each project
  const milestonesByProject: Record<string, string[]> = {};

  for (const [projectCode, projectId] of Object.entries(projects.projectsByCode)) {
    const existingMilestones = await prisma.projectMilestone.findMany({
      where: { organisationId: orgId, projectId },
      orderBy: { sequenceOrder: 'asc' },
    });

    if (existingMilestones.length > 0) {
      milestonesByProject[projectCode] = existingMilestones.map((m) => m.id);
      continue;
    }

    const ids: string[] = [];
    for (let i = 0; i < STANDARD_PHASES.length; i++) {
      const phase = STANDARD_PHASES[i];
      let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' = 'NOT_STARTED';
      let completionPercentage = 0;

      if (projectCode === 'PRJ-DEMO-004') {
        status = 'COMPLETED';
        completionPercentage = 100;
      } else if (projectCode === 'PRJ-DEMO-001' || projectCode === 'PRJ-DEMO-002') {
        if (i < 3) {
          status = 'COMPLETED';
          completionPercentage = 100;
        } else if (i === 3) {
          status = 'IN_PROGRESS';
          completionPercentage = 60;
        }
      } else if (projectCode === 'PRJ-DEMO-006') {
        if (i < 3) {
          status = 'COMPLETED';
          completionPercentage = 100;
        } else if (i === 3) {
          status = 'DELAYED';
          completionPercentage = 40;
        }
      }

      const m = await prisma.projectMilestone.create({
        data: {
          organisationId: orgId,
          projectId,
          name: phase.name,
          phaseName: phase.name,
          sequenceOrder: i + 1,
          status,
          progressPercentage: completionPercentage,
          plannedStartDate: new Date(Date.now() + (i * 10 - 30) * 86400000),
          plannedEndDate: new Date(Date.now() + (i * 10 - 20) * 86400000),
        },
      });
      ids.push(m.id);
    }

    milestonesByProject[projectCode] = ids;
  }

  return { milestonesByProject };
}
