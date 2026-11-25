import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import {
  requireAuth,
  requireOrganisation,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireOrganisation,
  requirePermission('audit.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const logs = await prisma.auditLog.findMany({
        where: { organisationId: req.auth!.organisationId! },
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
      });

      res.status(200).json({ data: logs, meta: { requestId: req.id } });
    } catch (err) {
      next(err);
    }
  },
);

export const auditRoutes = router;
