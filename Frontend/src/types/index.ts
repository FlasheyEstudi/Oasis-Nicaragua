// ============================================
// OASIS - Tipos TypeScript
// Contrato de API - Sección 3 del documento técnico
// ============================================

// --- Enums / Union Types ---
export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'patient' | 'pharmacy_manager' | 'delivery_driver' | 'clinic_admin' | 'pharmacy_admin' | 'cashier';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type PrescriptionStatus = 'active' | 'partially_fulfilled' | 'fulfilled' | 'expired';

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export type DosageForm = 'tablet' | 'syrup' | 'injection' | 'capsule' | 'cream' | 'drops' | 'inhaler';

// --- Auth Types ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  };
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

// --- User Types ---
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  isActive?: boolean;
  created_at: string;
  updated_at: string;
  verification_status?: 'pending' | 'submitted' | 'approved' | 'rejected';
  verification_deadline?: string | null;
  legal_documents?: string | null;
  // Perfiles anidados según rol
  doctor_profile?: DoctorProfile;
  patient_profile?: PatientProfile;
  receptionist_profile?: ReceptionistProfile;
  pharmacy_manager_profile?: PharmacyManagerProfile;
  delivery_driver_profile?: DeliveryDriverProfile;
}

export interface DoctorProfile {
  user_id: string;
  clinic_id: string;
  specialty: string;
  license_number: string;
  clinic?: Clinic;
}

export interface PatientProfile {
  user_id: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies: string[];
  medical_notes?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

export interface ReceptionistProfile {
  user_id: string;
  clinic_id: string;
  clinic?: Clinic;
}

export interface PharmacyManagerProfile {
  user_id: string;
  pharmacy_id: string;
  pharmacy?: Pharmacy;
}

export interface DeliveryDriverProfile {
  user_id: string;
  pharmacy_id?: string;
  vehicle_type?: string;
  license_plate?: string;
  current_lat?: number;
  current_lng?: number;
  is_available: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface UpdatePatientProfileRequest {
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string[];
  medical_notes?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

// --- Clinic Types ---
export interface Clinic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  is_active: boolean;
  isActive?: boolean;
  admin_id?: string;
  owner_id?: string;
  ownerId?: string;
  created_at: string;
  updated_at: string;
  distance_in_meters?: number;
  doctors?: DoctorProfile[];
}

export interface CreateClinicRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

export type UpdateClinicRequest = Partial<CreateClinicRequest>

// --- Pharmacy Types ---
export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  is_active: boolean;
  isActive?: boolean;
  manager_id?: string;
  owner_id?: string;
  ownerId?: string;
  created_at: string;
  updated_at: string;
  distance_in_meters?: number;
  available_medicines?: AvailableMedicine[];
  matchedMedicinesCount?: number;
  matchedMedicines?: string[];
}

export interface AvailableMedicine {
  medicine_id: string;
  stock: number;
  price: number;
}

export interface CreatePharmacyRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

export type UpdatePharmacyRequest = Partial<CreatePharmacyRequest>

// --- Medicine Types ---
export interface Medicine {
  id: string;
  name: string;
  description?: string;
  dosage_form?: DosageForm;
  active_ingredient?: string;
  strength?: string;
  requires_prescription: boolean;
  barcode?: string;
}

export interface CreateMedicineRequest {
  name: string;
  description?: string;
  dosage_form?: DosageForm;
  active_ingredient?: string;
  strength?: string;
  requires_prescription?: boolean;
  barcode?: string;
}

export type UpdateMedicineRequest = Partial<CreateMedicineRequest>

// --- Inventory Types ---
export interface InventoryItem {
  id: string;
  medicine: Medicine;
  quantity: number;
  unitPrice: number;
  updated_at: string;
}

export interface AdjustInventoryRequest {
  medicine_id: string;
  quantity_change: number;
  price?: number;
}

// --- Appointment Types ---
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  date_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Datos expandidos
  patient?: User;
  doctor?: User;
  clinic?: Clinic;
  sale?: any;
}

export interface CreateAppointmentRequest {
  doctor_id: string;
  clinic_id: string;
  date_time: string;
  duration_minutes?: number;
  patient_id?: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  date_time?: string;
  duration_minutes?: number;
  notes?: string;
  status?: AppointmentStatus;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

// --- Prescription Types ---
export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  issue_date: string;
  status: PrescriptionStatus;
  qr_code_data: string;
  notes?: string;
  expiration_date: string;
  updated_at: string;
  // Datos expandidos
  patient?: User;
  doctor?: User;
  clinic?: Clinic;
  lines?: PrescriptionLine[];
}

export interface PrescriptionLine {
  id: string;
  prescription_id: string;
  medicine_id: string;
  medicine?: Medicine;
  quantity: number;
  quantity_fulfilled: number;
  dosage_instructions?: string;
  batches?: Array<{
    id: string;
    batchNumber: string;
    expirationDate: string | null;
    quantityToDeduct: number;
    sellingPrice?: number;
  }>;
}

export interface CreatePrescriptionRequest {
  patient_id: string;
  clinic_id: string;
  expiration_date: string;
  notes?: string;
  signature_pin: string;
  lines: CreatePrescriptionLineRequest[];
}

export interface CreatePrescriptionLineRequest {
  medicine_id: string;
  quantity: number;
  dosage_instructions?: string;
}

export interface ValidatePrescriptionRequest {
  qr_data: string;
  pharmacy_id?: string;
}

export interface FulfillPrescriptionRequest {
  pharmacy_id: string;
  items: FulfillItemRequest[];
}

export interface FulfillItemRequest {
  prescription_line_id: string;
  quantity_fulfilled: number;
  batches?: Array<{
    batch_id: string;
    quantity: number;
  }>;
}

// --- Delivery / Sales Types ---
export interface DeliveryOrder {
  id: string;
  pharmacy_id: string;
  patient_id?: string;
  delivery_driver_id?: string;
  status: DeliveryStatus;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  pickup_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  order_date: string;
  delivered_at?: string;
  notes?: string;
  // Datos expandidos
  pharmacy?: Pharmacy;
  patient?: User;
  driver?: User;
  items?: DeliveryOrderItem[];
  sale?: any;
}

export interface DeliveryOrderItem {
  id: string;
  delivery_order_id: string;
  medicine_id: string;
  medicine?: Medicine;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleRequest {
  items: SaleItemRequest[];
  patient_id?: string;
  prescription_id?: string;
  is_delivery: boolean;
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  notes?: string;
  payments?: Array<{
    method: string;
    amount: number;
    transaction_id?: string;
  }>;
}

export interface SaleItemRequest {
  medicine_id: string;
  quantity: number;
  unit_price: number;
}

export interface SaleResponse {
  success: boolean;
  data: {
    sale_id: string;
    delivery_order?: {
      id: string;
      status: DeliveryStatus;
    };
  };
}

export interface AssignDriverRequest {
  driver_id: string;
}

export interface UpdateDeliveryStatusRequest {
  status: DeliveryStatus;
  current_lat?: number;
  current_lng?: number;
}

export interface DeliveryRoute {
  distance_meters: number;
  duration_seconds: number;
  geometry: string;
}

// --- Admin Types ---
export interface AdminStats {
  total_clinics: number;
  total_pharmacies: number;
  total_doctors: number;
  total_patients: number;
  total_appointments: number;
  total_prescriptions: number;
  total_sales: number;
  total_delivery_orders: number;
  appointments_by_status: Record<AppointmentStatus, number>;
  prescriptions_by_status: Record<PrescriptionStatus, number>;
  deliveries_by_status: Record<DeliveryStatus, number>;
  recent_sales: number;
  monthly_revenue: number;
  peak_hours: Array<{ hour: string; count: number }>;
  revenue_chart: Array<{ date: string; amount: number }>;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: string;
  created_at: string;
}

// --- Pagination Types ---
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

// --- API Error Types ---
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

// --- UI Navigation Types ---
export type AppPage =
  | 'aceptar-invitacion'
  | 'bienvenida'
  | 'entrar'
  | 'registro'
  | 'recuperar-cuenta'
  | 'cambiar-clave'
  | 'inicio'
  | 'citas'
  | 'nueva-cita'
  | 'detalle-cita'
  | 'recetas'
  | 'detalle-receta'
  | 'mapa-farmacias'
  | 'detalle-farmacia'
  | 'solicitud-envio'
  | 'seguimiento'
  | 'consulta'
  | 'gestionar-clinicas'
  | 'gestionar-farmacias'
  | 'gestionar-usuarios'
  | 'inventario'
  | 'surtimiento'
  | 'gestion-pedidos'
  | 'inicio-repartidor'
  | 'detalle-envio'
  | 'perfil'
  | 'auditoria'
  | 'venta'
  | 'manage-settings'
  | 'gestionar-configuracion'
  | string; // Keep string for dynamic routes like verify-

export interface DoctorDocument {
  id: string;
  doctorId: string;
  type: string;
  documentUrl: string;
  expiryDate?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  doctor?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
}

export interface ClinicDocument {
  id: string;
  clinicId: string;
  type: string;
  documentUrl: string;
  expiryDate?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  rejectionReason?: string | null;
  notes?: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  clinic?: {
    id: string;
    name: string;
    address: string;
    phone?: string | null;
  };
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
}
