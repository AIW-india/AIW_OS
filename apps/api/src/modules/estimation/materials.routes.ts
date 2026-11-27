import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import multer from 'multer';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { recordAuditEvent } from '../../common/audit/audit.service.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

// Validation Schemas
const MaterialCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  parentId: z.string().uuid().optional(),
});

const MaterialCreateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(2).max(150),
  sku: z.string().min(2).max(50),
  description: z.string().max(255).optional(),
  unit: z.string().min(1).max(20),
  standardRate: z.number().nonnegative(),
  vendorRate: z.number().nonnegative().optional(),
  preferredVendor: z.string().max(150).optional(),
  hsnCode: z.string().max(20).optional(),
  taxRate: z.number().min(0).max(100).default(18),
});

const MaterialUpdateSchema = MaterialCreateSchema.partial();

// ------------------------------------------------------------------------------
// CATEGORIES
// ------------------------------------------------------------------------------

router.get(
  '/categories',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const categories = await prisma.materialCategory.findMany({
        where: { organisationId: orgId },
        include: {
          subcategories: true,
          _count: { select: { materials: true } },
        },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ data: categories, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/categories',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  validateRequest({ body: MaterialCategorySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const category = await prisma.materialCategory.create({
        data: {
          organisationId: orgId,
          name: req.body.name,
          description: req.body.description ?? null,
          parentId: req.body.parentId ?? null,
        },
      });
      res.status(201).json({ data: category, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// MATERIALS CRUD & RATE HISTORY
// ------------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { search, categoryId, status, page = '1', limit = '50' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organisationId: orgId };
      if (status && typeof status === 'string') where.status = status;
      if (categoryId && typeof categoryId === 'string') where.categoryId = categoryId;
      if (search && typeof search === 'string') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { preferredVendor: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.material.findMany({
          where,
          include: { category: true },
          orderBy: { name: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.material.count({ where }),
      ]);

      res.status(200).json({
        data: items,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          requestId: req.id,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  validateRequest({ body: MaterialCreateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { sku } = req.body;

      const existing = await prisma.material.findUnique({
        where: { organisationId_sku: { organisationId: orgId, sku } },
      });
      if (existing) {
        throw new AppError('SKU already exists in organisation', 409, 'SKU_EXISTS');
      }

      const material = await prisma.material.create({
        data: {
          organisationId: orgId,
          categoryId: req.body.categoryId ?? null,
          name: req.body.name,
          sku: req.body.sku,
          description: req.body.description ?? null,
          unit: req.body.unit,
          standardRate: req.body.standardRate,
          vendorRate: req.body.vendorRate ?? null,
          preferredVendor: req.body.preferredVendor ?? null,
          hsnCode: req.body.hsnCode ?? null,
          taxRate: req.body.taxRate,
          status: 'ACTIVE',
        },
      });

      // Log initial rate in rate history
      await prisma.materialRateHistory.create({
        data: {
          materialId: material.id,
          rate: material.standardRate,
          vendorRate: material.vendorRate,
          changedByUserId: req.auth!.userId,
          reason: 'Initial creation',
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'material.created',
        resourceType: 'material',
        resourceId: material.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: material,
      });

      res.status(201).json({ data: material, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id/history',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const material = await prisma.material.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!material) throw new NotFoundError('Material not found');

      const history = await prisma.materialRateHistory.findMany({
        where: { materialId: material.id },
        orderBy: { effectiveFrom: 'desc' },
      });

      res.status(200).json({ data: history, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const item = await prisma.material.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          category: true,
          rateHistory: { orderBy: { effectiveFrom: 'desc' }, take: 20 },
        },
      });
      if (!item) throw new NotFoundError('Material not found');
      res.status(200).json({ data: item, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

const handleMaterialUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const current = await prisma.material.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!current) throw new NotFoundError('Material not found');

      const rateChanged =
        req.body.standardRate !== undefined &&
        Number(current.standardRate) !== Number(req.body.standardRate);

      const updated = await prisma.material.update({
        where: { id: current.id },
        data: req.body,
      });

      if (rateChanged) {
        await prisma.materialRateHistory.create({
          data: {
            materialId: current.id,
            rate: updated.standardRate,
            vendorRate: updated.vendorRate,
            changedByUserId: req.auth!.userId,
            reason: 'Rate updated',
          },
        });
      }

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'material.updated',
        resourceType: 'material',
        resourceId: current.id,
        requestId: req.id,
        ipAddress: req.ip,
        beforeJson: current,
        afterJson: updated,
      });

      res.status(200).json({ data: updated, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  };

router.put(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  validateRequest({ body: MaterialUpdateSchema }),
  handleMaterialUpdate,
);

router.patch(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  validateRequest({ body: MaterialUpdateSchema }),
  handleMaterialUpdate,
);

// ------------------------------------------------------------------------------
// BULK EXCEL IMPORT & EXPORT
// ------------------------------------------------------------------------------

router.get(
  '/export/excel',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const materials = await prisma.material.findMany({
        where: { organisationId: orgId },
        include: { category: true },
        orderBy: { sku: 'asc' },
      });

      const rows = materials.map((m) => ({
        SKU: m.sku,
        Name: m.name,
        Category: m.category?.name || 'General',
        Unit: m.unit,
        'Standard Rate (INR)': Number(m.standardRate),
        'Vendor Rate (INR)': m.vendorRate ? Number(m.vendorRate) : '',
        'Preferred Vendor': m.preferredVendor || '',
        'HSN Code': m.hsnCode || '',
        'Tax Rate %': Number(m.taxRate),
        Status: m.status,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename="materials-library.xlsx"');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.status(200).send(buf);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/import/excel',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.rates.manage'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      if (!req.file) throw new AppError('Excel file is required', 400, 'FILE_REQUIRED');

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new AppError('Excel file is empty', 400, 'EMPTY_FILE');

      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (rows.length === 0) throw new AppError('No data rows found', 400, 'NO_DATA');

      let createdCount = 0;
      let updatedCount = 0;

      for (const row of rows) {
        const sku = String(row.SKU || row.sku || '').trim();
        const name = String(row.Name || row.name || '').trim();
        const unit = String(row.Unit || row.unit || 'NOS').trim();
        const standardRate = Number(row['Standard Rate (INR)'] || row.standardRate || 0);
        if (!sku || !name) continue;

        const existing = await prisma.material.findUnique({
          where: { organisationId_sku: { organisationId: orgId, sku } },
        });

        if (existing) {
          await prisma.material.update({
            where: { id: existing.id },
            data: {
              name,
              unit,
              standardRate,
              vendorRate: row['Vendor Rate (INR)'] ? Number(row['Vendor Rate (INR)']) : undefined,
              preferredVendor: row['Preferred Vendor'] || undefined,
            },
          });
          updatedCount++;
        } else {
          await prisma.material.create({
            data: {
              organisationId: orgId,
              sku,
              name,
              unit,
              standardRate,
              vendorRate: row['Vendor Rate (INR)'] ? Number(row['Vendor Rate (INR)']) : undefined,
              preferredVendor: row['Preferred Vendor'] || undefined,
              status: 'ACTIVE',
            },
          });
          createdCount++;
        }
      }

      res.status(200).json({
        data: { createdCount, updatedCount, totalProcessed: rows.length },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  },
);

export const materialRoutes = router;
