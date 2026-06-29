import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as medicineService from '@/lib/services/medicine.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const requiresPrescription = searchParams.get('requires_prescription') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const medicines = await medicineService.getMedicines({
      search,
      requiresPrescription,
      limit,
    });

    return successResponse(medicines);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}
