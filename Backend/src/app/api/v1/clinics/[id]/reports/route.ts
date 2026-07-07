// OASIS - Clinic Activity Report PDF API Route
// GET /api/v1/clinics/[id]/reports - Generate clinic activity and sales report PDF

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

      // Restricción de acceso a personal de la clínica
      if (role === 'clinic_admin') {
        const clinic = await db.clinic.findFirst({
          where: { id, ownerId: userId }
        });
        if (!clinic) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes propiedad de esta clínica', null, 403);
        }
      } else if (role !== 'admin') {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Acceso no autorizado', null, 403);
      }

      // Obtener datos de la clínica y sus ventas
      const clinic = await db.clinic.findUnique({ where: { id } });
      if (!clinic) return errorResponse(ErrorCodes.NOT_FOUND, 'Clínica no encontrada', null, 404);

      const sales = await db.sale.findMany({
        where: { clinicId: id },
        orderBy: { createdAt: 'desc' },
        take: 50 // Límite de las últimas 50 ventas/servicios
      });

      const title = `Reporte de Servicios: ${clinic.name}`;
      const subtitle = `Historial de consultas y cobros clínicos registrados.`;
      const headers = ['Operación ID', 'Fecha y Hora', 'Monto Cobrado', 'Estado'];
      
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
      rows.push(['-', 'RECAUDACIÓN TOTAL', `C$ ${sumTotal.toFixed(2)}`, '-']);

      const pdfBuffer = await generateReportPDF(title, subtitle, headers, rows);

      const response = new NextResponse(new Uint8Array(pdfBuffer));
      response.headers.set('Content-Type', 'application/pdf');
      response.headers.set('Content-Disposition', `inline; filename="reporte-clinica-${id}.pdf"`);
      return response;
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno', null, 500);
    }
  },
  { roles: ['admin', 'clinic_admin'] }
);
