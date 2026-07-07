// OASIS - Patient Profile API Route
// GET /api/v1/users/me/patient-profile - Retrieve patient profile
// PATCH /api/v1/users/me/patient-profile - Update/Upsert patient profile

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { db } from '@/lib/db';
import { z } from 'zod';

const patientProfileSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional(),
  bloodType: z.string().max(5, 'Grupo sanguíneo inválido').optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { userId } = req.user;
    const profile = await db.patientProfile.findUnique({
      where: { userId }
    });
    if (!profile) return errorResponse(ErrorCodes.NOT_FOUND, 'Perfil de paciente no encontrado', null, 404);
    return successResponse(profile, 'Perfil de paciente obtenido');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno', null, 500);
  }
}, { roles: ['patient', 'admin'] });

export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const parsed = patientProfileSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, null, 400);
    }

    const { userId } = req.user;
    const profile = await db.patientProfile.upsert({
      where: { userId },
      update: parsed.data,
      create: {
        userId,
        ...parsed.data
      }
    });

    return successResponse(profile, 'Perfil de paciente guardado con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno', null, 500);
  }
}, { roles: ['patient', 'admin'] });
