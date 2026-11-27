import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { jsPDF } from 'jspdf';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { validateRequest } from '../../common/middleware/validate.js';
import { recordAuditEvent } from '../../common/audit/audit.service.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';

const router = Router();

const GenerateQuotationSchema = z.object({
  estimateId: z.string().uuid(),
  title: z.string().min(2).max(150).optional(),
  validUntil: z.string().datetime().optional(),
  termsAndConditions: z.string().max(3000).optional(),
  termsConditions: z.string().max(3000).optional(),
  paymentSchedule: z
    .array(
      z.object({
        milestone: z.string().min(1),
        percentage: z.number().min(0).max(100).optional(),
        percent: z.number().min(0).max(100).optional(),
        amount: z.number().nonnegative().optional(),
      }),
    )
    .optional(),
});

const QuotationApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'APPROVE', 'REJECT']),
  comments: z.string().max(500).optional(),
});

const QuotationDispatchSchema = z.object({
  recipientEmail: z.string().email(),
  channel: z.enum(['EMAIL', 'PORTAL', 'WHATSAPP']).default('EMAIL'),
});

async function generateQuotationNumber(organisationId: string): Promise<string> {
  const count = await prisma.quotation.count({ where: { organisationId } });
  return `QT-${String(count + 1).padStart(5, '0')}`;
}

// ------------------------------------------------------------------------------
// QUOTATIONS LIST
// ------------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.quotations.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const { status, customerId, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organisationId: orgId };
      if (status && typeof status === 'string') where.status = status;
      if (customerId && typeof customerId === 'string') where.customerId = customerId;

      const [items, total] = await Promise.all([
        prisma.quotation.findMany({
          where,
          include: {
            customer: { select: { id: true, customerNumber: true, name: true, email: true } },
            estimate: { select: { id: true, estimateNumber: true, title: true } },
            createdBy: { select: { id: true, name: true } },
            approvals: {
              orderBy: { decidedAt: 'desc' },
              take: 1,
              include: { approver: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.quotation.count({ where }),
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

// ------------------------------------------------------------------------------
// GENERATE QUOTATION FROM ESTIMATE
// ------------------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.quotations.create'),
  validateRequest({ body: GenerateQuotationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const estimate = await prisma.estimate.findFirst({
        where: { id: req.body.estimateId, organisationId: orgId },
      });
      if (!estimate) throw new NotFoundError('Estimate not found');

      const quotationNumber = await generateQuotationNumber(orgId);

      const quotation = await prisma.quotation.create({
        data: {
          organisationId: orgId,
          quotationNumber,
          revisionNumber: 1,
          estimateId: estimate.id,
          customerId: estimate.customerId ?? null,
          title: req.body.title || `Quotation for ${estimate.title}`,
          status: 'PENDING_APPROVAL',
          validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
          termsAndConditions:
            req.body.termsAndConditions ||
            req.body.termsConditions ||
            '1. 50% Advance on signing, 40% stage progression, 10% handover.\n2. Validity: 15 days from issue date.',
          paymentSchedule: req.body.paymentSchedule ? req.body.paymentSchedule : undefined,
          subtotal: estimate.subtotalCost,
          discountAmount: estimate.discountAmount,
          taxAmount: estimate.taxAmount,
          grandTotal: estimate.grandTotal,
          currency: estimate.currency,
          createdByUserId: req.auth!.userId,
        },
        include: {
          customer: true,
          estimate: true,
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'quotation.generated',
        resourceType: 'quotation',
        resourceId: quotation.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { quotationNumber, grandTotal: quotation.grandTotal },
      });

      res.status(201).json({ data: quotation, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// GET QUOTATION DETAILS
// ------------------------------------------------------------------------------

router.get(
  '/:id',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.quotations.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const quotation = await prisma.quotation.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true, email: true } },
          estimate: {
            include: {
              sections: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  items: {
                    orderBy: { orderIndex: 'asc' },
                  },
                },
              },
            },
          },
          approvals: {
            orderBy: { decidedAt: 'desc' },
            include: { approver: { select: { id: true, name: true, email: true } } },
          },
        },
      });
      if (!quotation) throw new NotFoundError('Quotation not found');
      res.status(200).json({ data: quotation, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// COMMERCIAL APPROVAL WORKFLOW
// ------------------------------------------------------------------------------

router.post(
  '/:id/approve',
  requireAuth,
  requireOrganisation,
  requirePermission('quotations.approve'),
  validateRequest({ body: QuotationApprovalSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const quotation = await prisma.quotation.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!quotation) throw new NotFoundError('Quotation not found');

      if (quotation.status !== 'PENDING_APPROVAL' && quotation.status !== 'DRAFT') {
        throw new AppError(
          `Cannot approve quotation in status ${quotation.status}`,
          400,
          'INVALID_STATUS',
        );
      }

      const isApproved = req.body.decision === 'APPROVED' || req.body.decision === 'APPROVE';
      const nextStatus = isApproved ? 'APPROVED' : 'REJECTED';

      const [approval, updated] = await prisma.$transaction([
        prisma.quotationApproval.create({
          data: {
            quotationId: quotation.id,
            approverUserId: req.auth!.userId,
            decision: nextStatus,
            comments: req.body.comments ?? null,
          },
        }),
        prisma.quotation.update({
          where: { id: quotation.id },
          data: { status: nextStatus },
        }),
      ]);

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: `quotation.${nextStatus.toLowerCase()}`,
        resourceType: 'quotation',
        resourceId: quotation.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { decision: req.body.decision, comments: req.body.comments },
      });

      res.status(200).json({ data: { quotation: updated, approval }, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// DISPATCH APPROVED QUOTATION
// ------------------------------------------------------------------------------

router.post(
  '/:id/dispatch',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.quotations.dispatch'),
  validateRequest({ body: QuotationDispatchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const quotation = await prisma.quotation.findFirst({
        where: { id: req.params.id, organisationId: orgId },
      });
      if (!quotation) throw new NotFoundError('Quotation not found');

      if (quotation.status !== 'APPROVED') {
        throw new AppError(
          'Official dispatch is blocked until an authorised owner or management approver approves this exact version.',
          403,
          'QUOTATION_NOT_APPROVED',
        );
      }

      const dispatched = await prisma.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
          dispatchedTo: req.body.recipientEmail,
        },
      });

      await recordAuditEvent({
        organisationId: orgId,
        actorUserId: req.auth!.userId,
        action: 'quotation.dispatched',
        resourceType: 'quotation',
        resourceId: quotation.id,
        requestId: req.id,
        ipAddress: req.ip,
        afterJson: { dispatchedTo: req.body.recipientEmail, channel: req.body.channel },
      });

      res.status(200).json({ data: dispatched, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

// ------------------------------------------------------------------------------
// PDF EXPORT GENERATION
// ------------------------------------------------------------------------------

router.get(
  '/:id/pdf',
  requireAuth,
  requireOrganisation,
  requirePermission('estimation.quotations.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organisationId!;
      const quotation = await prisma.quotation.findFirst({
        where: { id: req.params.id, organisationId: orgId },
        include: {
          customer: true,
          organisation: true,
          estimate: {
            include: {
              sections: {
                orderBy: { orderIndex: 'asc' },
                include: { items: { orderBy: { orderIndex: 'asc' } } },
              },
            },
          },
        },
      });
      if (!quotation) throw new NotFoundError('Quotation not found');

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      // Title & Header
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text(quotation.organisation.name, 40, 50);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('OFFICIAL COMMERCIAL QUOTATION', 40, 68);

      doc.setDrawColor(226, 232, 240);
      doc.line(40, 80, 555, 80);

      // Quotation Metadata
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`Quotation #: ${quotation.quotationNumber} (Rev ${quotation.revisionNumber})`, 40, 105);
      doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`, 40, 120);
      doc.text(`Status: ${quotation.status}`, 40, 135);

      if (quotation.customer) {
        doc.text(`Customer: ${quotation.customer.name}`, 320, 105);
        if (quotation.customer.email) doc.text(`Email: ${quotation.customer.email}`, 320, 120);
        if (quotation.customer.phone) doc.text(`Phone: ${quotation.customer.phone}`, 320, 135);
      }

      // Sections summary
      let y = 170;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Bill of Quantities Summary', 40, y);
      y += 20;

      for (const s of quotation.estimate.sections) {
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        const sectionTotal = s.items.reduce((acc, i) => acc + Number(i.itemTotal), 0);
        doc.text(`• ${s.title}`, 45, y);
        doc.text(`INR ${sectionTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y);
        y += 18;
      }

      y += 15;
      doc.line(40, y, 555, y);
      y += 20;

      // Totals
      doc.setFontSize(10);
      doc.text('Subtotal:', 350, y);
      doc.text(`INR ${Number(quotation.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y);
      y += 18;

      if (Number(quotation.discountAmount) > 0) {
        doc.text('Discount:', 350, y);
        doc.text(`- INR ${Number(quotation.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y);
        y += 18;
      }

      doc.text('Taxes (GST):', 350, y);
      doc.text(`INR ${Number(quotation.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y);
      y += 22;

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Grand Total:', 350, y);
      doc.text(`INR ${Number(quotation.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, y);

      // Terms
      if (quotation.termsAndConditions) {
        y += 40;
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('Terms & Conditions:', 40, y);
        y += 16;
        doc.setTextColor(51, 65, 85);
        doc.text(quotation.termsAndConditions.slice(0, 500), 40, y, { maxWidth: 515 });
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${quotation.quotationNumber}-Rev${quotation.revisionNumber}.pdf"`,
      );
      res.status(200).send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  },
);

export const quotationRoutes = router;
