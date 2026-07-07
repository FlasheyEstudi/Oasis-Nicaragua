// OASIS - Pharmacy Sales Report PDF API Route
// GET /api/v1/pharmacies/[id]/reports - Generate sales report PDF for a pharmacy

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateReportPDF } from '@/lib/utils/pdf-generator';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { errorResponse, ErrorCodes } from '@/lib/utils/api-response';

export const GET = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const { userId, role } = req.user;

      // Restricción de acceso para asegurar que el usuario pertenece a la farmacia
      if (role === 'pharmacy_manager') {
        const profile = await db.pharmacyManagerProfile.findUnique({
          where: { userId },
          select: { pharmacyId: true }
        });
        if (profile?.pharmacyId !== id) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'Acceso denegado a esta farmacia', null, 403);
        }
      } else if (role === 'pharmacy_admin') {
        const pharmacy = await db.pharmacy.findFirst({
          where: { id, ownerId: userId }
        });
        if (!pharmacy) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes propiedad de esta farmacia', null, 403);
        }
      } else if (role !== 'admin') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Acceso no autorizado', null, 403);
      }

      // Obtener datos de la farmacia y sus ventas
      const pharmacy = await db.pharmacy.findUnique({ where: { id } });
      if (!pharmacy) return errorResponse(ErrorCodes.NOT_FOUND, 'Farmacia no encontrada', null, 404);

      const sales = await db.sale.findMany({
        where: { pharmacyId: id },
        orderBy: { createdAt: 'desc' },
        take: 50 // Límite de las últimas 50 ventas
      });

      const title = `Reporte de Ventas: ${pharmacy.name}`;
      const subtitle = `Historial de las últimas ${sales.length} transacciones registradas.`;
      const headers = ['Comprobante ID', 'Fecha y Hora', 'Total', 'Estado'];
      
      let sumTotal = 0;
      const rows = sales.map((sale) => {
        sumTotal += sale.totalAmount;
        return [
          sale.id.slice(-8).toUpperCase(),
          new Date(sale.createdAt).toLocaleString('es-NI'),
          `C$ ${sale.totalAmount.toFixed(2)}`,
          sale.status.toUpperCase()
        ];
      });

      // Añadir fila de sumatoria total al final
      rows.push(['-', 'TOTAL ACUMULADO', `C$ ${sumTotal.toFixed(2)}`, '-']);

      const pdfBuffer = await generateReportPDF(title, subtitle, headers, rows);

      const response = new NextResponse(new Uint8Array(pdfBuffer));
      response.headers.set('Content-Type', 'application/pdf');
      response.headers.set('Content-Disposition', `inline; filename="reporte-farmacia-${id}.pdf"`);
      return response;
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno', null, 500);
    }
  },
  { roles: ['admin', 'pharmacy_admin', 'pharmacy_manager'] }
);
