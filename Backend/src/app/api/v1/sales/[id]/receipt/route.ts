// OASIS - Get Sale Receipt PDF API Route
// GET /api/v1/sales/[id]/receipt - Fetch receipt/invoice in A4/thermal PDF format

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateReceiptPDF } from '@/lib/utils/pdf-generator';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { errorResponse, ErrorCodes } from '@/lib/utils/api-response';

export const GET = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      
      const sale = await db.sale.findUnique({
        where: { id },
        include: {
          saleItems: { include: { medicine: true } },
          pharmacy: { include: { address: true } },
        },
      });

      if (!sale) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Venta no encontrada', null, 404);
      }

      // Generar PDF del ticket
      const pdfBuffer = await generateReceiptPDF({
        id: sale.id,
        date: sale.createdAt,
        pharmacyName: sale.pharmacy?.name || 'Oasis',
        pharmacyAddress: sale.pharmacy?.address?.address || 'Managua, Nicaragua',
        items: sale.saleItems.map((item) => ({
          name: item.medicine?.name || 'Medicamento',
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        totalAmount: sale.totalAmount,
        isDelivery: sale.isDelivery,
        deliveryFee: sale.pharmacy?.deliveryFee || 0
      });

      const response = new NextResponse(new Uint8Array(pdfBuffer));
      response.headers.set('Content-Type', 'application/pdf');
      response.headers.set('Content-Disposition', 'inline; filename="receipt-' + id + '.pdf"');
      
      return response;
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  }
);
