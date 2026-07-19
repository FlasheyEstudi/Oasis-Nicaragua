'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft, Heart, Stethoscope, Store, Truck, ShieldCheck, Users, Activity, Sparkles } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuthStore } from '@/store/auth-store';
import { auth } from '@/lib/firebase-config';
import { demoLogin, login as apiLogin } from '@/api/auth';
import { post, getErrorMessage } from '@/api/client';
import { OrganicBlobs } from '@/components/oasis/organic-blobs';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import { cn } from '@/lib/utils';

export default function PaginaIniciarSesion() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const loginStore = useAuthStore((s) => s.login);
  const setNotification = useAuthStore((s) => s.setNotification);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!email.trim() || !password.trim()) {
      setApiError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiLogin({ email: email.trim(), password: password.trim() });
      const redirectPath = loginStore(data.user, data.access_token);
      router.push(redirectPath);
    } catch (error) {
      setApiError(getErrorMessage(error));
      setNotification({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setApiError(null);
    setIsGoogleSubmitting(true);

    try {
      let idToken = 'mock-token-wendellflashey2023';

      if (auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        idToken = await result.user.getIdToken();
      } else {
        console.warn('Firebase Auth no inicializado en local. Usando bypass seguro.');
      }

      const response = await post<any>('/auth/firebase-login', { idToken });

      if (response.success && response.data) {
        const redirectPath = loginStore(response.data.user, response.data.access_token);
        setNotification({ type: 'success', message: 'Ingreso rápido con Google exitoso' });
        router.push(redirectPath);
      } else {
        setApiError('Error al iniciar sesión con Google.');
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user')) {
        return;
      }
      console.error('Google Sign-In Error:', error);
      setApiError(getErrorMessage(error));
      setNotification({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleDemoLogin(role: string) {
    if (isSubmitting || isDemoLoading) return;
    setIsDemoLoading(role);
    setApiError(null);
    try {
      const data = await demoLogin(role);
      const redirectPath = loginStore(data.user, data.access_token);
      setNotification({ type: 'success', message: `Acceso rápido exitoso como ${data.user.name}` });
      router.push(redirectPath);
    } catch (err) {
      console.error('Demo login failed', err);
      setApiError('El acceso rápido demo falló. Revisa tu conexión al servidor backend.');
    } finally {
      setIsDemoLoading(null);
    }
  }

  const demoRoles = [
    { id: 'patient', label: 'Soy Paciente', icon: <Heart className="size-3.5" />, color: 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400 font-bold' },
    { id: 'doctor', label: 'Soy Doctor', icon: <Stethoscope className="size-3.5" />, color: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold' },
    { id: 'pharmacy_manager', label: 'Soy Farmacia', icon: <Store className="size-3.5" />, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' },
    { id: 'delivery_driver', label: 'Soy Repartidor', icon: <Truck className="size-3.5" />, color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold' },
  ];

  return (
    <div className="relative flex min-h-screen md:h-screen md:max-h-screen overflow-y-auto md:overflow-hidden items-center justify-center px-4 py-6 md:py-0 bg-[#FAFAFA] dark:bg-[#05070c] transition-colors duration-500 select-none">
      <OrganicBlobs />

      {/* Auras de Gradientes Shader Blobs */}
      <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[110px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[110px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md md:max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Panel Izquierdo: Ventajas (Oculto en móvil) */}
          <div className="hidden md:flex md:col-span-5 flex-col justify-between p-8 rounded-[2rem] bg-teal-500/5 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/60 backdrop-blur-3xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-wider bg-teal-500/10 text-teal-500 border border-teal-500/20 uppercase font-mono">
                  Oasis Nicaragua
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight leading-snug mb-3 text-slate-800 dark:text-white">
                Eleva tu Salud Digital
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-light mb-8">
                Oasis es la plataforma de salud líder en telemedicina y entrega farmacéutica en Nicaragua. Diseñado para simplificar tu vida y proteger a tu familia.
              </p>

              <div className="space-y-4">
                {[
                  { title: 'Rastreo Satelital Activo', desc: 'Sigue tus medicamentos en tiempo real por mapa interactivo.', icon: <Activity className="size-4 text-teal-600 dark:text-teal-400" /> },
                  { title: 'Firma Digital Médica', desc: 'Recetas oficiales aprobadas con firma electrónica HMAC.', icon: <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" /> },
                  { title: 'Núcleo Familiar Seguro', desc: 'Vincula familiares y dependientes con códigos de 6 dígitos.', icon: <Users className="size-4 text-cyan-600 dark:text-cyan-400" /> },
                  { title: 'Historial Centralizado', desc: 'Toda tu información clínica resguardada de forma profesional.', icon: <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" /> },
                ].map((item, idx) => (
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
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/30 dark:border-zinc-800/30 flex items-center justify-between text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
              <span>© 2026 Oasis Nicaragua</span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En Línea
              </span>
            </div>
          </div>

          {/* Panel Derecho: Formulario de Login */}
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

              {/* Logo */}
              <div className="flex flex-col items-center mb-6">
                <AnimatedLogo className="scale-95 mb-2" showLabel={false} />
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1">Iniciar Sesión</h1>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Ingresa a tu oasis de salud</p>
              </div>

              {/* Error API */}
              {apiError && (
                <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-400 mb-4 font-medium">
                  {apiError}
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="ejemplo@oasis.com"
                      autoComplete="email"
                      disabled={isSubmitting || isGoogleSubmitting || !!isDemoLoading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting || isGoogleSubmitting || !!isDemoLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-11 pr-11 rounded-xl text-xs bg-slate-100/40 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-800 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || isGoogleSubmitting || !!isDemoLoading}
                    className="clay-btn-primary w-full h-11 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ingresando...
                      </>
                    ) : (
                      <>
                        Iniciar sesión
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Google Sign-in Button */}
                  <button
                    type="button"
                    disabled={isSubmitting || isGoogleSubmitting || !!isDemoLoading}
                    onClick={handleGoogleLogin}
                    className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-sm relative overflow-hidden"
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
                    <span>Continuar con Google</span>
                  </button>
                </div>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  ¿No tienes cuenta?{' '}
                  <button
                    onClick={() => router.push('/registro')}
                    className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold transition-colors cursor-pointer"
                  >
                    Crear cuenta
                  </button>
                </p>
              </div>
            </div>

            {/* Quick Demo Section */}
            <div className="mt-6 pt-4 border-t border-slate-200/30 dark:border-zinc-800/40">
              <p className="text-[8px] uppercase tracking-widest font-black text-slate-400 dark:text-zinc-500 text-center mb-3">
                Acceso rápido Demo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    disabled={isSubmitting || isGoogleSubmitting || !!isDemoLoading}
                    onClick={() => handleDemoLogin(role.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer justify-center",
                      role.color
                    )}
                  >
                    {isDemoLoading === role.id ? (
                      <Loader2 className="size-3.5 animate-spin text-teal-500" />
                    ) : (
                      <>
                        {role.icon}
                        {role.label}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
