import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { NotFoundError, ForbiddenError } from '../../common/errors/app-error.js';
import { checkProjectAccess } from './project-scope.js';

const router = Router();

const CreateDocumentSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(150),
  category: z.enum([
    'DRAWINGS',
    'CLIENT_APPROVALS',
    'CONTRACTS',
    'SITE_PHOTOGRAPHS',
    'TECHNICAL_SPECS',
    'OTHER',
  ]),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
  fileUrl: z.string().min(1),
  description: z.string().max(500).optional(),
});

// ------------------------------------------------------------------------------
// LIST DOCUMENTS FOR A PROJECT
// ------------------------------------------------------------------------------
router.get(
  '/project/:projectId',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.documents.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const userId = req.auth!.userId;
      const permissions = req.auth!.permissions || [];

      const scope = await checkProjectAccess(orgId, req.params.projectId, userId, permissions);
      if (!scope.hasAccess) throw new ForbiddenError('Not authorised to view project documents.');

      const { category } = req.query;
      const where: any = { projectId: req.params.projectId, organisationId: orgId };
      if (category && typeof category === 'string') where.category = category;

      const documents = await prisma.projectDocument.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ data: documents, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// UPLOAD / REGISTER DOCUMENT RECORD
// ------------------------------------------------------------------------------
router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.documents.upload'),
  validateRequest({ body: CreateDocumentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const {
        projectId,
        title,
        category,
        fileName,
        fileSize,
        mimeType,
        fileUrl,
        description,
      } = req.body;

      const project = await prisma.project.findFirst({
        where: { id: projectId, organisationId: orgId },
      });
      if (!project) throw new NotFoundError('Project not found');

      const doc = await prisma.$transaction(async (tx) => {
        const d = await tx.projectDocument.create({
          data: {
            organisationId: orgId,
            projectId,
            title,
            category,
            fileName,
            fileSize,
            mimeType,
            fileUrl,
            description: description ?? null,
            uploadedByUserId: req.auth!.userId,
          },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        });

        await tx.projectActivity.create({
          data: {
            organisationId: orgId,
            projectId,
            actorUserId: req.auth!.userId,
            action: 'document.uploaded',
            description: `Document "${d.title}" (${d.category}) uploaded.`,
          },
        });

        return d;
      });

      res.status(201).json({ data: doc, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// DELETE DOCUMENT RECORD
// ------------------------------------------------------------------------------
router.delete(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('projects.documents.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const existing = await prisma.projectDocument.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!existing) throw new NotFoundError('Document not found');

      await prisma.projectDocument.delete({
        where: { id: existing.id },
      });

      res.status(200).json({ success: true, message: 'Document removed.' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
