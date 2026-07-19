import { create } from 'zustand';
import type { User, UserRole } from '@/types';
import { setAccessToken, getAccessToken, clearAuthTokens } from '@/api/client';
import { getMe, refreshToken, logout as apiLogout } from '@/api/auth';

function safeLocalStorageSet(key: string, value: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn(`LocalStorage write failed for key "${key}":`, e);
  }
}

function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn(`LocalStorage read failed for key "${key}":`, e);
  }
  return null;
}

function safeLocalStorageRemove(key: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`LocalStorage remove failed for key "${key}":`, e);
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  selectedItemId: string | null;
  prescriptionId: string | null;
  notification: { type: 'success' | 'error' | 'warning' | 'info'; message: string } | null;
  representedUser: User | null;
  originalAccessToken: string | null;
  isElderlyMode: boolean;

  setUser: (user: User | null) => void;
  login: (user: User, accessToken: string) => string; // returns redirect path
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setPrescriptionId: (id: string | null) => void;
  setNotification: (notification: { type: 'success' | 'error' | 'warning' | 'info'; message: string } | null) => void;
  hydrate: () => Promise<string | null>; // returns redirect path if logged in
  setRepresentedUser: (user: User | null) => Promise<void>;
  toggleElderlyMode: () => void;
  getRoleHome: () => string;
}

export function getHomePathForRole(role: UserRole): string {
  switch (role) {
    case 'admin': return '/administracion';
    case 'clinic_admin': return '/administracion/clinicas';
    case 'pharmacy_admin': return '/administracion/farmacias';
    case 'doctor': return '/medico';
    case 'receptionist': return '/recepcion';
    case 'patient': return '/paciente';
    case 'pharmacy_manager':
    case 'cashier':
      return '/farmacia';
    case 'delivery_driver': return '/repartidor';
    default:
      return '/';
  }
}

function normalizeUser(user: User | null): User | null {
  if (!user) return null;
  const normalized = { ...user } as any;
  
  // Normalize patient profile
  const patientProfile = normalized.patientProfile || normalized.patient_profile;
  if (patientProfile) {
    const p = { ...patientProfile };
    p.user_id = p.user_id || p.userId;
    p.userId = p.userId || p.user_id;
    normalized.patient_profile = p;
    normalized.patientProfile = p;
  }
  
  // Normalize doctor profile
  const doctorProfile = normalized.doctorProfile || normalized.doctor_profile;
  if (doctorProfile) {
    const d = { ...doctorProfile };
    d.user_id = d.user_id || d.userId;
    d.userId = d.userId || d.user_id;
    d.clinic_id = d.clinic_id || d.clinicId;
    d.clinicId = d.clinicId || d.clinic_id;
    d.license_number = d.license_number || d.licenseNumber;
    d.licenseNumber = d.licenseNumber || d.license_number;
    normalized.doctor_profile = d;
    normalized.doctorProfile = d;
  }
  
  // Normalize receptionist profile
  const receptionistProfile = normalized.receptionistProfile || normalized.receptionist_profile;
  if (receptionistProfile) {
    const r = { ...receptionistProfile };
    r.user_id = r.user_id || r.userId;
    r.userId = r.userId || r.user_id;
    r.clinic_id = r.clinic_id || r.clinicId;
    r.clinicId = r.clinicId || r.clinic_id;
    normalized.receptionist_profile = r;
    normalized.receptionistProfile = r;
  }
  
  // Normalize pharmacy manager profile
  const pharmacyManagerProfile = normalized.pharmacyManagerProfile || normalized.pharmacy_manager_profile;
  if (pharmacyManagerProfile) {
    const m = { ...pharmacyManagerProfile };
    m.user_id = m.user_id || m.userId;
    m.userId = m.userId || m.user_id;
    m.pharmacy_id = m.pharmacy_id || m.pharmacyId;
    m.pharmacyId = m.pharmacyId || m.pharmacy_id;
    normalized.pharmacy_manager_profile = m;
    normalized.pharmacyManagerProfile = m;
  }
  
  // Normalize delivery driver profile
  const deliveryDriverProfile = normalized.deliveryDriverProfile || normalized.delivery_driver_profile;
  if (deliveryDriverProfile) {
    const dd = { ...deliveryDriverProfile };
    dd.user_id = dd.user_id || dd.userId;
    dd.userId = dd.userId || dd.user_id;
    dd.pharmacy_id = dd.pharmacy_id || dd.pharmacyId;
    dd.pharmacyId = dd.pharmacyId || dd.pharmacy_id;
    dd.vehicle_type = dd.vehicle_type || dd.vehicleType;
    dd.vehicleType = dd.vehicleType || dd.vehicle_type;
    dd.license_plate = dd.license_plate || dd.licensePlate;
    dd.licensePlate = dd.licensePlate || dd.license_plate;
    dd.is_available = dd.is_available !== undefined ? dd.is_available : dd.isAvailable;
    dd.isAvailable = dd.isAvailable !== undefined ? dd.isAvailable : dd.is_available;
    normalized.delivery_driver_profile = dd;
    normalized.deliveryDriverProfile = dd;
  }
  
  return normalized;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  selectedItemId: null,
  prescriptionId: null,
  notification: null,
  representedUser: null,
  originalAccessToken: null,
  isElderlyMode: false,

  setUser: (user) => {
    const normalized = normalizeUser(user);
    set({ user: normalized, isAuthenticated: !!normalized });
  },

  login: (user, accessToken) => {
    setAccessToken(accessToken);
    const normalized = normalizeUser(user);
    const redirectPath = getHomePathForRole(normalized?.role || user.role);
    set({
      user: normalized,
      isAuthenticated: true,
      isLoading: false,
      notification: { type: 'success', message: `¡Bienvenido, ${user.name}!` },
    });
    return redirectPath;
  },

  logout: () => {
    apiLogout().catch((err) => {
      console.warn('OASIS: Backend session revocation deferred:', err.message);
    });
    clearAuthTokens();
    safeLocalStorageRemove('oasis_prescription_id');
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      selectedItemId: null,
      prescriptionId: null,
      notification: null,
      representedUser: null,
    });
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('elderly-mode');
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  setPrescriptionId: (prescriptionId) => {
    if (prescriptionId) {
      safeLocalStorageSet('oasis_prescription_id', prescriptionId);
    } else {
      safeLocalStorageRemove('oasis_prescription_id');
    }
    set({ prescriptionId });
  },

  setNotification: (notification) => {
    set({ notification });
    if (notification) {
      setTimeout(() => {
        set({ notification: null });
      }, 4000);
    }
  },

  setRepresentedUser: async (representedUser) => {
    const { originalAccessToken } = get();

    if (!representedUser) {
      if (originalAccessToken) {
        setAccessToken(originalAccessToken);
      }
      set({ representedUser: null, originalAccessToken: null });
      return;
    }

    try {
      set({ isLoading: true });
      const { actAsFamily } = await import('@/api/family');
      const res = await actAsFamily(representedUser.id);
      const currentToken = getAccessToken();
      const savedToken = originalAccessToken || currentToken;

      setAccessToken(res.token);
      set({
        representedUser: {
          ...representedUser,
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
        },
        originalAccessToken: savedToken,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error switching representation context:', err);
      set({ isLoading: false });
    }
  },

  toggleElderlyMode: () => {
    const next = !get().isElderlyMode;
    set({ isElderlyMode: next });
    if (typeof window !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('elderly-mode');
      } else {
        document.documentElement.classList.remove('elderly-mode');
      }
    }
  },

  hydrate: async () => {
    if (typeof window === 'undefined') return null;
    set({ isLoading: true });
    try {
      const { access_token } = await refreshToken();
      setAccessToken(access_token);
      const user = await getMe();
      const normalized = normalizeUser(user);
      const redirectPath = getHomePathForRole(normalized?.role || user.role);
      
      const savedPrescriptionId = safeLocalStorageGet('oasis_prescription_id');
      
      set({
        user: normalized,
        isAuthenticated: true,
        isHydrated: true,
        isLoading: false,
        prescriptionId: savedPrescriptionId,
      });
      return redirectPath;
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isHydrated: true,
        isLoading: false,
      });
      return null;
    }
  },

  getRoleHome: () => {
    const { user } = get();
    if (!user) return '/iniciar-sesion';
    return getHomePathForRole(user.role);
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    useAuthStore.getState().logout();
    window.location.href = '/iniciar-sesion';
  });

  window.addEventListener('auth:roles-updated', async () => {
    try {
      const user = await getMe();
      const normalized = normalizeUser(user);
      if (normalized) {
        const homePage = getHomePathForRole(normalized.role);
        const currentRole = useAuthStore.getState().user?.role;
        
        useAuthStore.setState({
          user: normalized,
          isAuthenticated: true,
        });

        if (normalized.role !== currentRole) {
          window.location.href = homePage;
        }
      }
    } catch (err) {
      console.warn('OASIS: Failed to sync reactively after role update event:', err);
    }
  });
}
