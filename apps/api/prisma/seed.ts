import { prisma } from '../src/database/prisma.js';
import { seedOrganisationContext } from './seed-data/organisation.js';
import { seedEmployees } from './seed-data/employees.js';
import { seedCrmData } from './seed-data/crm.js';
import { seedEstimationData } from './seed-data/estimation.js';
import { seedQuotationsData } from './seed-data/quotations.js';
import { seedProjectsData } from './seed-data/projects.js';
import { seedMilestonesData } from './seed-data/milestones.js';
import { seedTasksAndDocumentsData } from './seed-data/tasks.js';

async function printSummary(organisationId: string, organisationName: string) {
  const [
    users,
    departments,
    designations,
    leads,
    customers,
    lostLeads,
    followUps,
    siteVisits,
    materials,
    labourRates,
    boqTemplates,
    estimates,
    quotations,
    projects,
    milestones,
    tasks,
    documents,
  ] = await Promise.all([
    prisma.user.count({ where: { organisationId } }),
    prisma.department.count({ where: { organisationId } }),
    prisma.designation.count({ where: { organisationId } }),
    prisma.lead.count({ where: { organisationId } }),
    prisma.customer.count({ where: { organisationId } }),
    prisma.lead.count({ where: { organisationId, status: 'LOST' } }),
    prisma.followUp.count({ where: { organisationId } }),
    prisma.siteVisit.count({ where: { organisationId } }),
    prisma.material.count({ where: { organisationId } }),
    prisma.labourRate.count({ where: { organisationId } }),
    prisma.boqTemplate.count({ where: { organisationId } }),
    prisma.estimate.count({ where: { organisationId } }),
    prisma.quotation.count({ where: { organisationId } }),
    prisma.project.count({ where: { organisationId } }),
    prisma.projectMilestone.count({ where: { organisationId } }),
    prisma.projectTask.count({ where: { organisationId } }),
    prisma.projectDocument.count({ where: { organisationId } }),
  ]);

  console.log('\n=== AIW OS Demo Data Summary ===');
  console.log(`Organisation: ${organisationName} (${organisationId})`);
  console.log(
    JSON.stringify(
      {
        users,
        departments,
        designations,
        crm: { leads, customers, lostLeads, followUps, siteVisits },
        estimation: { materials, labourRates, boqTemplates, estimates, quotations },
        projects: { projects, milestones, tasks, documents },
      },
      null,
      2,
    ),
  );
}

async function main() {
  const verifyOnly = process.argv.includes('--verify');

  if (verifyOnly) {
    const org =
      (await prisma.organisation.findUnique({ where: { slug: 'aiw' } })) ||
      (await prisma.organisation.findFirst({ where: { status: 'ACTIVE' } }));
    if (!org) throw new Error('No active organisation found.');
    await printSummary(org.id, org.name);
    return;
  }

  console.log('[Seed] Starting AIW OS Demo Data Engine...');
  const ctx = await seedOrganisationContext();
  console.log(`[Seed] Using existing organisation: ${ctx.organisationName} (${ctx.organisationId})`);

  const employees = await seedEmployees(ctx);
  console.log(`[Seed] Employees: ${employees.createdCount} created, ${employees.existingCount} preserved/existing`);

  const crm = await seedCrmData(ctx, employees);
  console.log(`[Seed] CRM: ${crm.leadIds.length} leads, ${crm.customerIds.length} customers`);

  const est = await seedEstimationData(ctx, crm);
  console.log(`[Seed] Estimation: ${est.materialIds.length} materials, ${est.labourIds.length} labour rates, ${Object.keys(est.estimatesByCode).length} estimates`);

  const quotations = await seedQuotationsData(ctx, crm, est);
  console.log(`[Seed] Quotations: ${Object.keys(quotations.quotationsByCode).length} quotations`);

  const projects = await seedProjectsData(ctx, employees, crm, quotations);
  console.log(`[Seed] Projects: ${Object.keys(projects.projectsByCode).length} projects`);

  const milestones = await seedMilestonesData(ctx, projects);
  console.log(`[Seed] Milestones seeded for ${Object.keys(milestones.milestonesByProject).length} projects`);

  await seedTasksAndDocumentsData(ctx, employees, projects, milestones);
  console.log('[Seed] Tasks, comments & documents seeded');

  await printSummary(ctx.organisationId, ctx.organisationName);
}

main()
  .catch((err) => {
    console.error('[Seed] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
