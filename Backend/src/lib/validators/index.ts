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

// === Validadores de Citas ===
export const createAppointmentSchema = z.object({
  doctor_id: z.string().min(1, 'Doctor requerido'),
  clinic_id: z.string().min(1, 'Clínica requerida'),
  date_time: z.string().min(1, 'Fecha y hora requeridas'),
  duration_minutes: z.number().int().min(15).max(120).default(30),
  notes: z.string().optional(),
  patient_id: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  cancellation_reason: z.string().optional(),
});

// === Validadores de Recetas ===
export const createPrescriptionSchema = z.object({
  patient_id: z.string().min(1, 'Paciente requerido'),
  clinic_id: z.string().min(1, 'Clínica requerida'),
  appointment_id: z.string().optional(),
  expiration_date: z.string().min(1, 'Fecha de expiración requerida'),
  notes: z.string().optional(),
  signature_pin: z.string().length(4, 'El PIN debe ser de 4 dígitos').regex(/^\d+$/, 'El PIN debe contener solo dígitos'),
  lines: z.array(z.object({
    medicine_id: z.string().min(1, 'Medicamento requerido'),
    quantity: z.number().int().min(1, 'Cantidad mínima: 1'),
    dosage_instructions: z.string().min(1, 'Instrucciones de dosificación requeridas'),
  })).min(1, 'Al menos una línea de receta requerida'),
});

export const validatePrescriptionSchema = z.object({
  qr_data: z.string().min(1, 'QR data requerido'),
  pharmacy_id: z.string().optional(),
});

export const fulfillPrescriptionSchema = z.object({
  pharmacy_id: z.string().min(1, 'Farmacia requerida'),
  items: z.array(z.object({
    prescription_line_id: z.string().min(1),
    quantity_fulfilled: z.number().int().min(1),
    batches: z.array(z.object({
      batch_id: z.string().min(1),
      quantity: z.number().int().min(1),
    })).optional(),
  })).min(1, 'Al menos un item requerido'),
});

// === Validadores de Ventas ===
export const createSaleSchema = z.object({
  items: z.array(z.object({
    medicine_id: z.string().min(1, 'Medicamento requerido'),
    quantity: z.number().int().min(1, 'Cantidad mínima: 1'),
    unit_price: z.number().min(0).optional(),
  })).min(1, 'Al menos un item requerido'),
  prescription_id: z.string().optional(),
  patient_id: z.string().optional(),
  clinic_id: z.string().optional(),
  appointment_id: z.string().optional(),
  is_delivery: z.boolean().default(false),
  delivery_address: z.string().optional(),
  delivery_lat: z.number().optional(),
  delivery_lng: z.number().optional(),
  notes: z.string().optional(),
  payments: z.array(z.object({
    amount: z.number().min(0, 'El monto debe ser positivo'),
    method: z.enum(['cash', 'card', 'bank_transfer', 'wallet'], {
      error: 'Método de pago inválido',
    }),
    currency: z.string().optional(),
    transaction_id: z.string().optional(),
  })).min(1, 'Al menos un método de pago requerido'),
});


// === Validadores de Envíos/Delivery ===
export const assignDriverSchema = z.object({
  driver_id: z.string().min(1, 'ID de repartidor requerido'),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['picked_up', 'delivered', 'cancelled']),
  notes: z.string().optional(),
});

export const recordCoordinateSchema = z.object({
  latitude: z.number({ message: 'Latitud requerida' }),
  longitude: z.number({ message: 'Longitud requerida' }),
});

export const verifyDeliveryQRSchema = z.object({
  qr_content: z.string().min(1, 'Contenido QR requerido'),
});

// === Validadores de Relaciones Familiares ===
export const createFamilyRelationshipSchema = z.object({
  patient_id: z.string().min(1, 'ID de paciente requerido'),
  relationship: z.string().min(1, 'Parentesco requerido'),
  permissions: z.array(z.string()).optional(),
});

export const verifyFamilyRelationshipSchema = z.object({
  verification_code: z.string().min(1, 'Código de verificación requerido'),
});

// === Validadores de Chats ===
export const createChatSchema = z.object({
  recipient_id: z.string().min(1, 'ID de receptor requerido'),
  type: z.enum(['support', 'patient_doctor', 'patient_driver']).default('support'),
  target_id: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'El mensaje no puede estar vacío'),
});

// === Validadores de Notificaciones ===
export const registerFCMTokenSchema = z.object({
  token: z.string().min(1, 'Token FCM requerido'),
});

// === Validadores de Recordatorios ===
export const createReminderSchema = z.object({
  prescription_line_id: z.string().min(1, 'ID de línea de receta requerido'),
  medicine_name: z.string().min(1, 'Nombre de medicamento requerido'),
  dosage_instructions: z.string().min(1, 'Instrucciones de dosificación requeridas'),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'La hora debe estar en formato HH:MM (24h)'),
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
