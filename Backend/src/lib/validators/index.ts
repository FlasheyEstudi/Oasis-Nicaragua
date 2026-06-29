import { z } from 'zod';
import { NextResponse } from 'next/server';
import { errorResponse, ErrorCodes } from '../utils/api-response';

// === Validadores de Autenticación ===
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['patient', 'clinic_admin', 'pharmacy_admin', 'pharmacy_manager', 'delivery_driver', 'admin']).default('patient'),
  pharmacyId: z.string().optional(),
  clinicId: z.string().optional(),
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
  invitationToken: z.string().optional(),
  entityName: z.string().optional(),
  entityAddress: z.string().optional(),
  entityPhone: z.string().optional(),
  entityLatitude: z.number().optional(),
  entityLongitude: z.number().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  new_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token requerido'),
});

// === Validadores de Clínicas y Farmacias ===
export const createClinicSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  address: z.string().min(1, 'Dirección requerida'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
  ownerId: z.string().optional(),
  owner_id: z.string().optional(),
});

export const updateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  ownerId: z.string().optional(),
  owner_id: z.string().optional(),
});

export const createPharmacySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  address: z.string().min(1, 'Dirección requerida'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
  delivery_fee: z.number().min(0).optional(),
  ownerId: z.string().optional(),
  owner_id: z.string().optional(),
});

export const updatePharmacySchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  delivery_fee: z.number().min(0).optional(),
  ownerId: z.string().optional(),
  owner_id: z.string().optional(),
});

// === Validadores de Inventario ===
export const adjustInventorySchema = z.object({
  medicine_id: z.string().min(1, 'Medicamento requerido'),
  quantity_change: z.number().int('El cambio debe ser un número entero'),
  new_price: z.number().min(0).optional(),
  reason: z.string().optional(),
});

export const seedInventorySchema = z.object({
  items: z.array(z.object({
    medicine_id: z.string().min(1),
    quantity: z.number().int().min(0),
    unit_price: z.number().min(0),
    min_stock: z.number().int().min(0).optional(),
  })).min(1, 'Al menos un item requerido'),
});

// === Helper de Validación de Cuerpos (Body) ===
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return {
      success: false,
      error: errorResponse(ErrorCodes.VALIDATION_ERROR, messages, null, 400),
    };
  }
  return { success: true, data: result.data };
}
