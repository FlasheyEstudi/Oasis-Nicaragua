import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createClinicSchema } from '@/lib/validators';
import * as clinicService from '@/lib/services/clinic.service';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Verificación opcional de rol para administradores
    let userRole: string | undefined;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyAccessToken(authHeader.slice(7));
      if (payload) userRole = payload.role;
    }

    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
    const radiusKm = searchParams.get('radius_km') 
      ? parseFloat(searchParams.get('radius_km')!) 
      : searchParams.get('radius')
      ? parseFloat(searchParams.get('radius')!)
      : undefined;

    const clinics = await clinicService.getClinics({
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('is_active') || undefined,
      userRole,
      lat,
      lng,
      radiusKm,
      ownerId: searchParams.get('owner_id') || undefined,
    });

    return successResponse(clinics);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(createClinicSchema, body);
    if (!validation.success) return validation.error;

    const clinic = await clinicService.createClinic(
      validation.data,
      req.user.userId,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(clinic, 'Clínica creada exitosamente', 201);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}, { roles: ['admin'] });
