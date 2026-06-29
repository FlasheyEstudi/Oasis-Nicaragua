import { db } from '../db';

export const createAuditLog = (
  data: { userId?: string; action: string; entityType: string; entityId?: string; details?: string; ipAddress?: string; userAgent?: string },
  tx?: any
) => (tx || db).auditLog.create({ data });

export async function getAuditLogs(filters: { userId?: string; action?: string; entityType?: string; dateFrom?: string; dateTo?: string; limit: number; skip: number }) {
  const where: any = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
      ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
    };
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: filters.skip,
      take: filters.limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    data: logs.map(l => ({ ...l, user_name: l.user?.name || 'Sistema', resource_type: l.entityType, created_at: l.createdAt.toISOString() })),
    total,
  };
}
