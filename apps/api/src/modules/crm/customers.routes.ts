import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { recordAuditEvent } from '../../common/audit/audit.service.js';
import { NotFoundError } from '../../common/errors/app-error.js';

const router = Router();

// --------------- Schemas ---------------

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  legalName: z.string().max(200).nullable().optional(),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  billingAddress: z.string().max(500).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const CreateContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
});

const CreateAddressSchema = z.object({
  type: z.enum(['BILLING', 'SITE', 'CORRESPONDENCE']).default('SITE'),
  line1: z.string().min(1).max(300),
  line2: z.string().max(300).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().min(1).max(20),
  country: z.string().max(100).default('India'),
  isPrimary: z.boolean().default(false),
});

const CreateNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

const ListCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'customerNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// --------------- Routes ---------------

// List customers
router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.view'),
  validateRequest({ query: ListCustomersQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { page, limit, search, type, status, sortBy, sortOrder } = req.query as unknown as z.infer<typeof ListCustomersQuerySchema>;

      const where: Record<string, unknown> = { organisationId: orgId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { customerNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (type) where.type = type;
      if (status) where.status = status;

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            convertedFromLead: { select: { id: true, leadNumber: true, customerName: true } },
            _count: { select: { contacts: true, addresses: true, notes: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.customer.count({ where }),
      ]);

      res.status(200).json({
        data: customers,
        meta: {
          requestId: req.id,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// Get single customer with all details
router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          convertedFromLead: {
            select: { id: true, leadNumber: true, customerName: true, createdAt: true },
          },
          createdByUser: { select: { id: true, name: true } },
          contacts: { orderBy: { isPrimary: 'desc' } },
          addresses: { orderBy: { isPrimary: 'desc' } },
          notes: {
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          followUps: {
            include: { assignedUser: { select: { id: true, name: true } } },
            orderBy: { scheduledAt: 'desc' },
            take: 20,
          },
          siteVisits: {
            include: { assignedUser: { select: { id: true, name: true } } },
            orderBy: { visitDate: 'desc' },
            take: 20,
          },
        },
      });

      if (!customer) throw new NotFoundError('Customer not found');

      res.status(200).json({ data: customer, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Update customer
router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.manage'),
  validateRequest({ body: UpdateCustomerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.customer.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Customer not found');

      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: req.body,
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'crm.customer.updated',
        resourceType: 'customer',
        resourceId: updated.id,
        requestId: req.id,
        ipAddress: req.ip,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Add customer contact
router.post(
  '/:id/contacts',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.manage'),
  validateRequest({ body: CreateContactSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!customer) throw new NotFoundError('Customer not found');

      // If this is marked as primary, unset other primary contacts
      if (req.body.isPrimary) {
        await prisma.customerContact.updateMany({
          where: { customerId: customer.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const contact = await prisma.customerContact.create({
        data: {
          customerId: customer.id,
          name: req.body.name,
          phone: req.body.phone ?? null,
          email: req.body.email ?? null,
          role: req.body.role ?? null,
          isPrimary: req.body.isPrimary,
        },
      });

      res.status(201).json({ data: contact, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Delete customer contact
router.delete(
  '/:id/contacts/:contactId',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!customer) throw new NotFoundError('Customer not found');

      const contact = await prisma.customerContact.findFirst({
        where: { id: req.params.contactId, customerId: customer.id },
      });
      if (!contact) throw new NotFoundError('Contact not found');

      await prisma.customerContact.delete({ where: { id: contact.id } });

      res.status(200).json({ data: { deleted: true }, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Add customer address
router.post(
  '/:id/addresses',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.manage'),
  validateRequest({ body: CreateAddressSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!customer) throw new NotFoundError('Customer not found');

      if (req.body.isPrimary) {
        await prisma.customerAddress.updateMany({
          where: { customerId: customer.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          ...req.body,
        },
      });

      res.status(201).json({ data: address, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Delete customer address
router.delete(
  '/:id/addresses/:addressId',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.manage'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!customer) throw new NotFoundError('Customer not found');

      const address = await prisma.customerAddress.findFirst({
        where: { id: req.params.addressId, customerId: customer.id },
      });
      if (!address) throw new NotFoundError('Address not found');

      await prisma.customerAddress.delete({ where: { id: address.id } });

      res.status(200).json({ data: { deleted: true }, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// Add customer note
router.post(
  '/:id/notes',
  requireAuth,
  requireOrganisation,
  requirePermission('crm.customers.manage'),
  validateRequest({ body: CreateNoteSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!customer) throw new NotFoundError('Customer not found');

      const note = await prisma.customerNote.create({
        data: {
          customerId: customer.id,
          content: req.body.content,
          createdByUserId: req.auth!.userId,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ data: note, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const customerRoutes = router;
