import { prisma } from '../../src/database/prisma.js';
import { auth } from '../../src/common/auth/better-auth.js';
import type { SeedOrgContext } from './organisation.js';

export const DEMO_DEFAULT_PASSWORD = 'DemoUser@2026!';

interface DemoEmployeeSpec {
  name: string;
  email: string;
  roleCode: string;
  department: string;
  designation: string;
}

const DEMO_EMPLOYEES: DemoEmployeeSpec[] = [
  // Admin (1)
  { name: 'Raghavendra Rao', email: 'admin.demo@aiw-demo.example', roleCode: 'ADMIN', department: 'HR & Administration', designation: 'Operations Admin' },
  // Project Managers (3)
  { name: 'Arjun Menon', email: 'pm1.demo@aiw-demo.example', roleCode: 'PROJECT_MANAGER', department: 'Project Management', designation: 'Project Manager' },
  { name: 'Kavya Nair', email: 'pm2.demo@aiw-demo.example', roleCode: 'PROJECT_MANAGER', department: 'Project Management', designation: 'Project Manager' },
  { name: 'Siddharth Kulkarni', email: 'pm3.demo@aiw-demo.example', roleCode: 'PROJECT_MANAGER', department: 'Project Management', designation: 'Project Manager' },
  // Site Engineers (4)
  { name: 'Vikramaditya Gowda', email: 'se1.demo@aiw-demo.example', roleCode: 'SITE_ENGINEER', department: 'Site Operations', designation: 'Senior Site Engineer' },
  { name: 'Prashanth Hegde', email: 'se2.demo@aiw-demo.example', roleCode: 'SITE_ENGINEER', department: 'Site Operations', designation: 'Site Engineer' },
  { name: 'Nikhil Deshmukh', email: 'se3.demo@aiw-demo.example', roleCode: 'SITE_ENGINEER', department: 'Site Operations', designation: 'Site Engineer' },
  { name: 'Suresh Babu', email: 'se4.demo@aiw-demo.example', roleCode: 'SITE_ENGINEER', department: 'Site Operations', designation: 'Site Supervisor' },
  // Architects / Interior Designers (2)
  { name: 'Ananya Krishnan', email: 'arch1.demo@aiw-demo.example', roleCode: 'ARCHITECT_INTERIOR_DESIGNER', department: 'Design & Architecture', designation: 'Lead Architect' },
  { name: 'Meera Iyer', email: 'arch2.demo@aiw-demo.example', roleCode: 'ARCHITECT_INTERIOR_DESIGNER', department: 'Design & Architecture', designation: 'Interior Designer' },
  // Accounts (2)
  { name: 'Deepak Joshi', email: 'accounts1.demo@aiw-demo.example', roleCode: 'ACCOUNTS', department: 'Finance & Accounts', designation: 'Accounts Executive' },
  { name: 'Sneha Bhat', email: 'accounts2.demo@aiw-demo.example', roleCode: 'ACCOUNTS', department: 'Finance & Accounts', designation: 'Accounts Executive' },
  // Procurement (2)
  { name: 'Karthik Reddy', email: 'procurement1.demo@aiw-demo.example', roleCode: 'PROCUREMENT', department: 'Procurement & Supply Chain', designation: 'Procurement Officer' },
  { name: 'Divya Shetty', email: 'procurement2.demo@aiw-demo.example', roleCode: 'PROCUREMENT', department: 'Procurement & Supply Chain', designation: 'Procurement Officer' },
  // HR / Office Admin (2)
  { name: 'Pooja Sharma', email: 'hr1.demo@aiw-demo.example', roleCode: 'HR_OFFICE_ADMIN', department: 'HR & Administration', designation: 'HR Executive' },
  { name: 'Manoj Verma', email: 'hr2.demo@aiw-demo.example', roleCode: 'HR_OFFICE_ADMIN', department: 'HR & Administration', designation: 'HR Executive' },
  // Workers / Contractors (10)
  { name: 'Ramesh Kumar', email: 'worker1.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Mahesh Yadav', email: 'worker2.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Ganesh Naik', email: 'worker3.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Shiva Prasad', email: 'worker4.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Venkatesh Murthy', email: 'worker5.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Basavaraj Patil', email: 'worker6.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Imran Khan', email: 'worker7.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Selvam Raj', email: 'worker8.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Harish Chandra', email: 'worker9.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
  { name: 'Santosh Das', email: 'worker10.demo@aiw-demo.example', roleCode: 'WORKER_CONTRACTOR', department: 'Field Workforce', designation: 'Skilled Contractor' },
];

export interface SeedEmployeesResult {
  byRole: Record<string, string[]>;
  createdCount: number;
  existingCount: number;
}

export async function seedEmployees(ctx: SeedOrgContext): Promise<SeedEmployeesResult> {
  const byRole: Record<string, string[]> = {};
  let createdCount = 0;
  let existingCount = 0;

  for (const spec of DEMO_EMPLOYEES) {
    let user = await prisma.user.findUnique({ where: { email: spec.email } });

    if (!user) {
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: spec.email,
          password: DEMO_DEFAULT_PASSWORD,
          name: spec.name,
        },
      });

      if (!signUpResult?.user?.id) {
        throw new Error(`Failed to create Better Auth user for ${spec.email}`);
      }

      user = await prisma.user.update({
        where: { id: signUpResult.user.id },
        data: {
          organisationId: ctx.organisationId,
          departmentId: ctx.departments[spec.department] ?? null,
          designationId: ctx.designations[spec.designation] ?? null,
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
      createdCount++;
    } else {
      existingCount++;
    }

    const roleId = ctx.roles[spec.roleCode];
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId,
          },
        },
        update: {},
        create: {
          organisationId: ctx.organisationId,
          userId: user.id,
          roleId,
          assignedByUserId: ctx.superAdminUserId,
        },
      });
    }

    if (!byRole[spec.roleCode]) byRole[spec.roleCode] = [];
    byRole[spec.roleCode].push(user.id);
  }

  return { byRole, createdCount, existingCount };
}
