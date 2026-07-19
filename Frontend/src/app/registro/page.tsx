'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, Check, X, Shield, Truck, Compass, Award, Building, Phone, MapPin, ArrowLeft, ChevronDown } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuthStore } from '@/store/auth-store';
import { auth } from '@/lib/firebase-config';
import { register as apiRegister } from '@/api/auth';
import { get, post, getErrorMessage } from '@/api/client';
import { OrganicBlobs } from '@/components/oasis/organic-blobs';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import { cn } from '@/lib/utils';

interface ClinicOrPharmacyListItem {
  id: string;
  name: string;
  address: string;
}

function PasswordRequirements({ password }: { password: string }) {
  const checks = [
    { label: 'Minimo 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos 1 mayuscula', met: /[A-Z]/.test(password) },
    { label: 'Al menos 1 numero', met: /[0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-1.5 text-xs">
          {check.met ? (
            <Check className="h-3.5 w-3.5 text-teal-500" />
          ) : (
            <X className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
          )}
          <span className={check.met ? 'text-teal-500 font-bold' : 'text-slate-400 dark:text-zinc-500'}>
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const roleAdvantages: Record<string, Array<{ title: string; desc: string; icon: any }>> = {
  patient: [
    { title: 'Teleconsulta Inmediata', desc: 'Conectate con medicos colegiados autorizados al instante.', icon: <Award className="size-4 text-teal-500" /> },
    { title: 'Entrega en Minutos', desc: 'Repartidores geolocalizados llevan tus medicinas seguras.', icon: <Truck className="size-4 text-emerald-500" /> },
    { title: 'Gestion Familiar', desc: 'Asocia dependientes facilmente con tu codigo privado.', icon: <Compass className="size-4 text-sky-500" /> },
    { title: 'Seguridad Militar', desc: 'Tus datos clinicos encriptados de extremo a extremo.', icon: <Shield className="size-4 text-indigo-500" /> },
  ],
  pharmacy_admin: [
    { title: 'Aumento de Ventas', desc: 'Llega a miles de pacientes que buscan medicamentos en tu zona.', icon: <Building className="size-4 text-teal-500" /> },
    { title: 'Control de Inventario', desc: 'Sincronizacion en tiempo real de stock y ventas.', icon: <Award className="size-4 text-emerald-500" /> },
    { title: 'Dispensacion QR', desc: 'Escanea y despacha recetas digitalmente sin errores.', icon: <Check className="size-4 text-sky-500" /> },
    { title: 'Firma HMAC Segura', desc: 'Validacion instantanea de autenticidad en cada transaccion.', icon: <Shield className="size-4 text-indigo-500" /> },
  ],
  delivery_driver: [
    { title: 'Entregas Inteligentes', desc: 'Ruta optima por geolocalizacion satelital por GPS en vivo.', icon: <Truck className="size-4 text-teal-500" /> },
    { title: 'Ingresos por Comision', desc: 'Gana mas dinero completando entregas de forma eficiente.', icon: <Award className="size-4 text-emerald-500" /> },
    { title: 'Horarios a tu Medida', desc: 'Trabaja con flexibilidad total y gestiona tus propios viajes.', icon: <Compass className="size-4 text-sky-500" /> },
    { title: 'Soporte Directo', desc: 'Asistencia y comunicacion directa con la farmacia y paciente.', icon: <Shield className="size-4 text-indigo-500" /> },
  ]
};

export default function PaginaRegistro() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isGoogleMode, setIsGoogleMode] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Geolocation States
  const [entityLat, setEntityLat] = useState<number | null>(null);
  const [entityLng, setEntityLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Dynamic Fields States
  const [pharmacyId, setPharmacyId] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [vehicleType, setVehicleType] = useState('motocicleta');
  const [licensePlate, setLicensePlate] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityAddress, setEntityAddress] = useState('');
  const [entityPhone, setEntityPhone] = useState('');

  // Dropdown lists
  const [pharmacies, setPharmacies] = useState<ClinicOrPharmacyListItem[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  const loginStore = useAuthStore((s) => s.login);
  const setNotification = useAuthStore((s) => s.setNotification);

  const isFinalStep = isGoogleMode
    ? (role === 'patient' ? step === 1 : step === 2)
    : (step === 3 || (role === 'patient' && step === 2));

  // Prefill from localstorage email capture
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefill = localStorage.getItem('oasis_prefill_correo');
      if (prefill) {
        setEmail(prefill);
        localStorage.removeItem('oasis_prefill_correo');
      }
    }
  }, []);

  const requestLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalizacion.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEntityLat(position.coords.latitude);
        setEntityLng(position.coords.longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        let errorMsg = 'No se pudo obtener la ubicacion. Por favor concede permisos de GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Permiso denegado. Activa el GPS de tu dispositivo y recarga.';
        }
        setLocationError(errorMsg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (step === 2 && (role === 'pharmacy_admin' || role === 'clinic_admin') && !entityLat) {
      requestLocation();
    }
  }, [step, role]);

  // Load pharmacies list if driver
  useEffect(() => {
    async function fetchPharmacies() {
      if (role === 'delivery_driver' || role === 'pharmacy_manager') {
        setIsLoadingLists(true);
        try {
          const res = await get<ClinicOrPharmacyListItem[]>('/pharmacies/list');
          if (res.success && Array.isArray(res.data)) {
            setPharmacies(res.data);
            if (res.data.length > 0) setPharmacyId(res.data[0].id);
          }
        } catch (err) {
          console.error('Error fetching pharmacies:', err);
        } finally {
          setIsLoadingLists(false);
        }
      }
    }
    fetchPharmacies();
  }, [role]);

  async function handleGoogleSignUp() {
    setApiError(null);
    setIsGoogleSubmitting(true);

    try {
      let idToken = 'mock-token-wendellflashey2023';
      let googleName = 'Usuario Demo Google';
      let googleEmail = 'demo-google@oasis.com';

      if (auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        idToken = await result.user.getIdToken();
        googleName = result.user.displayName || result.user.email?.split('@')[0] || 'Usuario Oasis';
        googleEmail = result.user.email || '';
      } else {
        console.warn('Firebase Auth no inicializado en local. Usando bypass seguro.');
      }

      setName(googleName);
      setEmail(googleEmail);
      setGoogleIdToken(idToken);
      setIsGoogleMode(true);
      setNotification({ type: 'success', message: 'Google autenticado. Por favor selecciona tu rol para continuar.' });
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user')) {
        return;
      }
      console.error('Google Sign-Up Error:', error);
      setApiError(getErrorMessage(error));
      setNotification({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleGoogleSubmit() {
    setApiError(null);

    if (role === 'pharmacy_admin' && (!entityName.trim() || !entityAddress.trim())) {
      setApiError('Por favor ingresa el nombre y la dirección de tu farmacia.');
      return;
    }

    if (role === 'clinic_admin' && (!entityName.trim() || !entityAddress.trim())) {
      setApiError('Por favor ingresa el nombre y la dirección de tu clínica.');
      return;
    }

    if (role === 'delivery_driver' && !licensePlate.trim()) {
      setApiError('Por favor ingresa la placa de tu vehículo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        idToken: googleIdToken,
        role,
      };

      if (role === 'pharmacy_admin') {
        payload.entityName = entityName;
        payload.entityAddress = entityAddress;
        payload.entityPhone = entityPhone || undefined;
        payload.entityLatitude = entityLat || undefined;
        payload.entityLongitude = entityLng || undefined;
      } else if (role === 'clinic_admin') {
        payload.entityName = entityName;
        payload.entityAddress = entityAddress;
        payload.entityPhone = entityPhone || undefined;
        payload.entityLatitude = entityLat || undefined;
        payload.entityLongitude = entityLng || undefined;
      } else if (role === 'delivery_driver') {
        payload.vehicleType = vehicleType;
        payload.licensePlate = licensePlate;
        payload.pharmacyId = pharmacyId || undefined;
      }

      const response = await post<any>('/auth/firebase-login', payload);

      if (response.success && response.data) {
        const redirectPath = loginStore(response.data.user, response.data.access_token);
        setNotification({ type: 'success', message: '¡Registro con Google completado con éxito!' });
        router.push(redirectPath);
      } else {
        setApiError('Error al registrarse con Google.');
      }
    } catch (error) {
      setApiError(getErrorMessage(error));
      setNotification({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextStep() {
    setApiError(null);
    if (step === 1) {
      if (!name.trim()) {
        setApiError('Por favor ingresa tu nombre completo.');
        return;
      }
      if (name.trim().split(' ').length < 2) {
        setApiError('Por favor ingresa tu nombre y apellido.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setApiError('Por favor ingresa un correo electronico valido.');
        return;
      }
      if (role === 'patient') {
        if (isGoogleMode) {
          handleGoogleSubmit();
        } else {
          setStep(2); // Goes to password setup for patients
        }
      } else {
        setStep(2); // Goes to entity configuration
      }
    } else if (step === 2 && role !== 'patient') {
      if (role === 'pharmacy_admin' || role === 'clinic_admin') {
        if (!entityName.trim()) {
          setApiError('Por favor ingresa el nombre del establecimiento.');
          return;
        }
        if (!entityAddress.trim()) {
          setApiError('Por favor ingresa la direccion.');
          return;
        }
        if (!entityLat || !entityLng) {
          setApiError('Es obligatorio obtener las coordenadas GPS de tu establecimiento.');
          return;
        }
      }
      if (role === 'delivery_driver' && !licensePlate.trim()) {
        setApiError('Por favor ingresa la placa de tu vehiculo.');
        return;
      }
      
      if (isGoogleMode) {
        handleGoogleSubmit();
      } else {
        setStep(3); // Goes to password setup
      }
    }
  }

  function handlePrevStep() {
    setApiError(null);
    setStep((prev) => prev - 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (password !== confirmPassword) {
      setApiError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setApiError('La contraseña debe tener minimo 8 caracteres, 1 mayuscula y 1 numero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        name,
        email,
        password,
        role,
      };

      if (role === 'pharmacy_admin') {
        payload.entityName = entityName;
        payload.entityAddress = entityAddress;
        payload.entityPhone = entityPhone || undefined;
        payload.entityLatitude = entityLat || undefined;
        payload.entityLongitude = entityLng || undefined;
      } else if (role === 'clinic_admin') {
        payload.entityName = entityName;
        payload.entityAddress = entityAddress;
        payload.entityPhone = entityPhone || undefined;
        payload.entityLatitude = entityLat || undefined;
        payload.entityLongitude = entityLng || undefined;
      } else if (role === 'delivery_driver') {
        payload.vehicleType = vehicleType;
        payload.licensePlate = licensePlate;
        payload.pharmacyId = pharmacyId || undefined;
      }

      const data = await apiRegister(payload as any);
      const redirectPath = loginStore(data.user, data.access_token);
      setNotification({ type: 'success', message: '¡Cuenta creada con éxito!' });
      router.push(redirectPath);
    } catch (error) {
      setApiError(getErrorMessage(error));
      setNotification({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen md:h-screen md:max-h-screen overflow-y-auto md:overflow-hidden items-center justify-center px-4 py-6 md:py-0 bg-[#FAFAFA] dark:bg-[#05070c] transition-colors duration-500 select-none">
      <OrganicBlobs />

      {/* Auras de Gradientes */}
      <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[110px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[110px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md md:max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Panel Izquierdo: Ventajas */}
          <div className="hidden md:flex md:col-span-5 flex-col justify-between p-8 rounded-[2rem] bg-teal-500/5 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/60 backdrop-blur-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-wider bg-teal-500/10 text-teal-500 border border-teal-500/20 uppercase font-mono">
                  Oasis Nicaragua
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight leading-snug mb-3 text-slate-800 dark:text-white">
                Crea tu Cuenta
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-light mb-8">
                Únete a Oasis hoy. Elige tu tipo de perfil y comienza a operar en la red de salud digital más segura del país.
              </p>

              <div className="relative min-h-[220px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    className="space-y-4"
                  >
                    {(roleAdvantages[role] || roleAdvantages.patient).map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white dark:bg-zinc-900/40 flex items-center justify-center border border-slate-200/50 dark:border-zinc-800/40 shadow-sm">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-800 dark:text-zinc-200">{item.title}</h4>
                          <p className="text-[9px] text-slate-500 dark:text-zinc-400 font-light mt-0.5 leading-snug">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/30 dark:border-zinc-800/30 flex items-center justify-between text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
              <span>© 2026 Oasis Nicaragua</span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Seguro
              </span>
            </div>
          </div>

          {/* Panel Derecho: Formulario de Registro */}
          <div className="col-span-1 md:col-span-7 flex flex-col justify-between bg-white dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/60 shadow-2xl rounded-[2rem] p-6 sm:p-8 backdrop-blur-3xl">
            <div>
              {/* Botón Volver */}
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white bg-slate-100/50 dark:bg-zinc-900/30 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 border border-slate-200/30 dark:border-zinc-800/30 transition-all mb-4 self-start cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                Volver al inicio
              </button>

              <div className="flex flex-col items-center mb-6">
                <AnimatedLogo className="scale-95 mb-2" showLabel={false} />
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1">Crear Cuenta</h1>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Forma parte de la red Oasis</p>
              </div>

              {/* Error API */}
              {apiError && (
                <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-400 mb-4 font-medium">
                  {apiError}
                </div>
              )}

              {/* Formulario de 3 Pasos */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (isFinalStep) {
                  if (isGoogleMode) {
                    handleGoogleSubmit();
                  } else {
                    handleSubmit(e);
                  }
                } else {
                  handleNextStep();
                }
              }} className="space-y-4">
                <AnimatePresence mode="wait">
                  
                  {/* PASO 1 */}
                  {step === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-3.5"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Paso 1: Datos Personales</span>
                        <span>{role === 'patient' ? '1 / 2' : '1 / 3'}</span>
                      </div>

                      <div>
                        <label htmlFor="reg-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                          Nombre completo
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            id="reg-name"
                            type="text"
                            required
                            placeholder="Juan Pérez"
                            disabled={isSubmitting || isGoogleMode}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                              "w-full h-11 pl-11 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all",
                              isGoogleMode ? "pr-24" : "pr-4"
                            )}
                          />
                          {isGoogleMode && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20">
                              Google ✓
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="reg-email" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                          Correo electrónico
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            id="reg-email"
                            type="email"
                            required
                            placeholder="juan@oasis.com"
                            disabled={isSubmitting || isGoogleMode}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={cn(
                              "w-full h-11 pl-11 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all",
                              isGoogleMode ? "pr-24" : "pr-4"
                            )}
                          />
                          {isGoogleMode && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20">
                              Google ✓
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                          Tipo de cuenta
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'patient', label: 'Paciente', desc: 'Citas y recetas' },
                            { value: 'delivery_driver', label: 'Repartidor', desc: 'Envíos con moto' },
                            { value: 'clinic_admin', label: 'Clínica', desc: 'Gestor de médicos' },
                            { value: 'pharmacy_admin', label: 'Farmacia', desc: 'Gestor de POS' }
                          ].map((item) => {
                            const isSel = role === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => setRole(item.value)}
                                className={cn(
                                  "flex flex-col items-start p-3 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
                                  isSel
                                    ? "bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400"
                                    : "bg-white/40 dark:bg-zinc-900/25 border-slate-200 dark:border-zinc-800 text-slate-500"
                                )}
                              >
                                <span className="text-[10px] font-black uppercase tracking-wide leading-none">{item.label}</span>
                                <span className="text-[8px] font-light text-slate-400 leading-snug mt-1">{item.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Google Sign-in Trigger inside Step 1 */}
                      {!isGoogleMode && (
                        <div className="pt-2">
                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className="w-full border-t border-slate-200/50 dark:border-zinc-800/40" />
                            </div>
                            <div className="relative flex justify-center text-[8px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-zinc-500">
                              <span className="bg-[#FAFAFA] dark:bg-[#05070c] px-2 transition-colors">O también</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isSubmitting || isGoogleSubmitting}
                            onClick={handleGoogleSignUp}
                            className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isGoogleSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                            ) : (
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                              </svg>
                            )}
                            <span>Registrarse con Google</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* PASO 2 (DETALLES ENTIDAD - SOLO COLABORADORES) */}
                  {step === 2 && role !== 'patient' && (
                    <motion.div
                      key="step-2-colab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-3.5"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Paso 2: Detalles de Entidad</span>
                        <span>{isGoogleMode ? '2 / 2' : '2 / 3'}</span>
                      </div>

                      {(role === 'pharmacy_admin' || role === 'clinic_admin') && (
                        <div className="space-y-3.5">
                          <div>
                            <label htmlFor="ent-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                              Nombre del establecimiento
                            </label>
                            <input
                              id="ent-name"
                              type="text"
                              required
                              placeholder="Ej. Farmacia Oasis Central"
                              value={entityName}
                              onChange={(e) => setEntityName(e.target.value)}
                              className="w-full h-11 px-4 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all"
                            />
                          </div>

                          <div>
                            <label htmlFor="ent-address" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                              Dirección exacta
                            </label>
                            <input
                              id="ent-address"
                              type="text"
                              required
                              placeholder="Ej. Esquina opuesta al Parque Central, León"
                              value={entityAddress}
                              onChange={(e) => setEntityAddress(e.target.value)}
                              className="w-full h-11 px-4 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all"
                            />
                          </div>

                          {/* GPS Widget */}
                          <div className="p-3.5 bg-slate-100/50 dark:bg-zinc-900/20 border border-slate-200/50 dark:border-zinc-800/40 rounded-2xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Georreferenciación Satelital (GPS)</span>
                              {entityLat && entityLng ? (
                                <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Activo</span>
                              ) : (
                                <span className="text-[8px] font-black uppercase text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">Requerido</span>
                              )}
                            </div>

                            {isLocating ? (
                              <div className="flex items-center gap-2 text-xs text-teal-500">
                                <Loader2 className="size-4 animate-spin" />
                                <span>Obteniendo coordenadas satelitales...</span>
                              </div>
                            ) : entityLat && entityLng ? (
                              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 bg-white/50 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-slate-200/20 dark:border-zinc-800/20">
                                <div>
                                  <p>Lat: {entityLat.toFixed(6)}</p>
                                  <p>Lng: {entityLng.toFixed(6)}</p>
                                </div>
                                <button type="button" onClick={requestLocation} className="text-teal-500 hover:underline">Recapturar</button>
                              </div>
                            ) : (
                              <div>
                                {locationError && <p className="text-[9px] text-rose-500 mb-2">{locationError}</p>}
                                <button type="button" onClick={requestLocation} className="w-full py-2.5 rounded-xl text-xs bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500/20 active:scale-[0.98] transition-all">
                                  Obtener Ubicación GPS
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {role === 'delivery_driver' && (
                        <div className="space-y-3.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                              Tipo de vehículo
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {['motocicleta', 'bicicleta', 'automovil'].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setVehicleType(t)}
                                  className={cn(
                                    "py-2.5 rounded-xl border text-xs font-bold transition-all capitalize cursor-pointer",
                                    vehicleType === t
                                      ? "bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-400"
                                      : "bg-white/40 dark:bg-zinc-900/25 border-slate-200 dark:border-zinc-800 text-slate-500"
                                  )}
                                >
                                  {t === 'automovil' ? 'Carro' : t.slice(0, 4)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label htmlFor="reg-plate" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                              Placa del vehículo
                            </label>
                            <input
                              id="reg-plate"
                              type="text"
                              required
                              placeholder="Ej. M-128491"
                              value={licensePlate}
                              onChange={(e) => setLicensePlate(e.target.value)}
                              className="w-full h-11 px-4 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all"
                            />
                          </div>

                          <div>
                            <label htmlFor="reg-pharmacy-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                              Farmacia afiliada (Opcional)
                            </label>
                            <div className="relative">
                              {isLoadingLists ? (
                                <div className="w-full h-11 px-4 rounded-xl text-xs bg-slate-100/40 border border-slate-200 flex items-center gap-2">
                                  <Loader2 className="size-4 animate-spin text-teal-500" />
                                  <span className="text-slate-400">Cargando farmacias...</span>
                                </div>
                              ) : (
                                <>
                                  <select
                                    id="reg-pharmacy-select"
                                    value={pharmacyId}
                                    onChange={(e) => setPharmacyId(e.target.value)}
                                    className="w-full h-11 pl-4 pr-10 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white focus:border-teal-500/50 focus:outline-none appearance-none cursor-pointer"
                                  >
                                    <option value="" className="bg-white dark:bg-zinc-950 text-slate-500">Repartidor Independiente</option>
                                    {pharmacies.map((ph) => (
                                      <option key={ph.id} value={ph.id} className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200">{ph.name}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* PASO 3 (CREDENCIALES Y CONTRASEÑAS - PASO 2 PARA PACIENTES) */}
                  {isFinalStep && !isGoogleMode && (
                    <motion.div
                      key="step-final"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-3.5"
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Paso {role === 'patient' ? '2: Credenciales' : '3: Credenciales'}</span>
                        <span>{role === 'patient' ? '2 / 2' : '3 / 3'}</span>
                      </div>

                      <div>
                        <label htmlFor="reg-pass" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                          Contraseña
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            id="reg-pass"
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-11 pl-11 pr-11 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PasswordRequirements password={password} />
                      </div>

                      <div>
                        <label htmlFor="reg-confirm" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                          Confirmar contraseña
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            id="reg-confirm"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 pl-11 pr-11 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all"
                          />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* Botones de acción inferior */}
                <div className="flex gap-3 pt-2">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={isSubmitting}
                      className="w-1/3 h-11 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100/50 dark:bg-zinc-900/30 border border-slate-200/30 dark:border-zinc-800/30 text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="size-3.5" />
                      Atrás
                    </button>
                  )}

                  {!isFinalStep ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className={cn(
                        "clay-btn-primary h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer",
                        step > 1 ? "w-2/3" : "w-full"
                      )}
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={isGoogleMode ? handleGoogleSubmit : handleSubmit}
                      disabled={isSubmitting}
                      className={cn(
                        "clay-btn-primary h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer",
                        step > 1 ? "w-2/3" : "w-full"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        <>
                          {isGoogleMode ? 'Completar con Google' : 'Crear cuenta'}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    onClick={() => router.push('/iniciar-sesion')}
                    className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold transition-colors cursor-pointer"
                  >
                    Iniciar sesión
                  </button>
                </p>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
