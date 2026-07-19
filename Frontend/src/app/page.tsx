'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, CheckCircle2, Shield, Heart, Stethoscope, 
  Store, Truck, HelpCircle, ChevronDown, ChevronRight, Calculator, Search, QrCode, 
  Percent, Star, Eye, RefreshCw, Smartphone
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import { LoadingScreen } from '@/components/oasis/loading-screen';
import { CounterAnimation } from '@/components/landing/counter-animation';
import { cn } from '@/lib/utils';

export default function PaginaInicioNueva() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  
  // Interactive Showcase Tab
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'paciente' | 'medico' | 'farmacia' | 'repartidor'>('paciente');

  // Interactive Tax & Law Calculator States
  const [userAge, setUserAge] = useState<number>(30);
  const [hasSeniorDiscount, setHasSeniorDiscount] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<'medicamento_esencial' | 'medicamento_general' | 'consulta'>('medicamento_esencial');
  const [basePrice, setBasePrice] = useState<number>(100);

  // Doctor sign demo
  const [pinInput, setPinInput] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signedToken, setSignedToken] = useState('');

  // Delivery tracker simulation
  const [deliveryProgress, setDeliveryProgress] = useState(45);
  
  // Custom Copilot helper states
  const [showCopilot, setShowCopilot] = useState(true);
  const [copilotMessage, setCopilotMessage] = useState(
    '¡Bienvenido a la nueva experiencia de Oasis! Utiliza el simulador de leyes abajo para ver cómo calculamos automáticamente los beneficios de la Ley 160 y Ley 822 en Nicaragua.'
  );

  useEffect(() => {
    // Hide splash loader after 1.5 seconds
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Update calculator based on age and selection
  useEffect(() => {
    setHasSeniorDiscount(userAge >= 60);
  }, [userAge]);

  const calculateFinalPrice = () => {
    let price = basePrice;
    let discountPercent = 0;
    let appliedIva = 0.15; // 15% Standard IVA in Nicaragua

    // 1. Check Ley 822 (Exemption of 15% IVA on essential medicines)
    if (selectedProductType === 'medicamento_esencial') {
      appliedIva = 0;
    }

    // 2. Check Ley 160 (Adulto Mayor discount: 20% on medicines, 30% on consultations)
    if (hasSeniorDiscount) {
      if (selectedProductType === 'consulta') {
        discountPercent = 30;
      } else {
        discountPercent = 20;
      }
    }

    const priceWithIva = price * (1 + appliedIva);
    const discountAmount = priceWithIva * (discountPercent / 100);
    const finalPrice = Math.max(0, priceWithIva - discountAmount);

    return {
      subtotal: price.toFixed(2),
      iva: (price * appliedIva).toFixed(2),
      discount: discountAmount.toFixed(2),
      discountRate: discountPercent,
      ivaExempt: appliedIva === 0,
      total: finalPrice.toFixed(2)
    };
  };

  const calcDetails = calculateFinalPrice();

  const handleStartPrefill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    localStorage.setItem('oasis_prefill_correo', emailInput.trim());
    router.push('/registro');
  };

  const executeDoctorSign = () => {
    if (pinInput.length !== 4) return;
    setIsSigning(true);
    setTimeout(() => {
      setIsSigning(false);
      setSignedToken('HMAC-SHA256: 4df592ca0e1b' + pinInput + 'ac92841bc');
      setCopilotMessage('¡Firma completada! La receta se ha cifrado digitalmente y está lista para ser validada con el código QR.');
    }, 1200);
  };

  return (
    <>
      <LoadingScreen isVisible={showSplash} />
      
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#060B0A] text-slate-800 dark:text-zinc-100 overflow-x-hidden relative font-sans transition-colors duration-500">
        
        {/* Soft Modern Glows & Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#10B981_0.6px,transparent_0.6px)] [background-size:24px_24px] opacity-10 dark:opacity-[0.04] pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] rounded-full bg-teal-500/5 dark:bg-emerald-500/[0.02] blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-0 w-[55vw] h-[55vw] rounded-full bg-sky-500/5 dark:bg-teal-500/[0.02] blur-[150px] pointer-events-none" />

        {/* ============ STICKY NAV ============ */}
        <header className="sticky top-0 z-50 w-full bg-[#FAF9F6]/80 dark:bg-[#060B0A]/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-zinc-800/40 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <AnimatedLogo size="sm" showLabel={true} />
            <span className="text-[8px] font-mono tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              AURA
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <a href="#inicio" className="hover:text-emerald-500 transition-colors">Inicio</a>
            <a href="#demostración" className="hover:text-emerald-500 transition-colors">Plataforma</a>
            <a href="#calculadora" className="hover:text-emerald-500 transition-colors">Calculadora Legal</a>
            <a href="#ecosistema" className="hover:text-emerald-500 transition-colors">Ecosistema</a>
            <a href="#ayuda" className="hover:text-emerald-500 transition-colors">Ayuda</a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle className="scale-90" />
            <button 
              onClick={() => router.push('/iniciar-sesion')} 
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-emerald-500 transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => router.push('/registro')} 
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer"
            >
              Registrarse
            </button>
          </div>
        </header>

        {/* ============ HERO SECTION ============ */}
        <section id="inicio" className="relative z-10 py-16 lg:py-24 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-8 min-h-[75vh] flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
            <Sparkles className="size-4 text-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase font-mono">
              Ecosistema Médico Nicaragüense de Siguiente Generación
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] text-slate-800 dark:text-white max-w-4xl mx-auto">
            La red de salud que conecta a todo{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 bg-clip-text text-transparent">
              Nicaragua
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 font-light leading-relaxed max-w-2xl mx-auto">
            Una plataforma digital unificada para agendado de citas clínicas, emisión de recetas encriptadas por QR, consulta de inventario FEFO en farmacias y despacho satelital GPS en mapa interactivo.
          </p>

          <form onSubmit={handleStartPrefill} className="flex flex-col sm:flex-row items-stretch gap-2 max-w-md mx-auto w-full p-1.5 rounded-2xl bg-white dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/60 shadow-[0_12px_32px_rgba(0,0,0,0.03)] backdrop-blur-md">
            <input
              type="email"
              placeholder="Ingresa tu correo institucional o personal..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-grow bg-transparent px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/15 cursor-pointer"
            >
              Comenzar gratis
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Normativa MINSA
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Sello Criptográfico HMAC
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Exención IVA Ley 822
            </span>
          </div>
        </section>

        {/* ============ DYNAMIC INTERACTIVE PLATFORM SHOWCASE ============ */}
        <section id="demostración" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto relative z-10">
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
              Explora la Plataforma Oasis
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-light max-w-xl mx-auto">
              Haz clic en cada pestaña para interactuar con los diferentes módulos operativos del ecosistema médico.
            </p>
          </div>

          <div className="clay-card rounded-[2.5rem] p-6 border-2 border-white/20 dark:border-white/5 shadow-2xl bg-white/40 dark:bg-zinc-950/20 backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Control Column */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Consola de Operaciones
                </p>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-tight">
                  Integración Operativa
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-light leading-relaxed">
                  Conectamos los flujos de salud con total transparencia legal y tecnológica para Nicaragua.
                </p>
              </div>

              {/* Selector Tabs */}
              <div className="flex flex-col gap-2">
                {[
                  { id: 'paciente', label: 'Pasaporte Paciente', desc: 'Códigos QR y datos familiares' },
                  { id: 'medico', label: 'Firma de Médicos', desc: 'Validación por firma digital PIN' },
                  { id: 'farmacia', label: 'Matriz Farmacia', desc: 'Algoritmo FEFO y control de stock' },
                  { id: 'repartidor', label: 'Rastreo Satelital', desc: 'Mapa GPS de rutas óptimas' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveShowcaseTab(tab.id as any);
                      setSignedToken('');
                      setPinInput('');
                    }}
                    className={cn(
                      "text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between group cursor-pointer",
                      activeShowcaseTab === tab.id
                        ? "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-emerald-500 shadow-md"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300"
                    )}
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">{tab.label}</p>
                      <p className="text-[9px] opacity-70 font-light mt-0.5">{tab.desc}</p>
                    </div>
                    <ChevronRight className={cn("size-4 opacity-0 group-hover:opacity-100 transition-opacity", activeShowcaseTab === tab.id && "opacity-100 text-emerald-500")} />
                  </button>
                ))}
              </div>

              <button
                onClick={() => router.push('/registro')}
                className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white hover:bg-emerald-500 hover:text-white cursor-pointer transition-colors"
              >
                Comenzar integración gratis
              </button>
            </div>

            {/* Showcase Frame Column */}
            <div className="lg:col-span-8 bg-slate-100/50 dark:bg-zinc-950/80 rounded-3xl p-6 border border-slate-200/50 dark:border-zinc-900/60 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
              
              <AnimatePresence mode="wait">
                
                {/* Paciente View */}
                {activeShowcaseTab === 'paciente' && (
                  <motion.div
                    key="paciente_view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-6 flex-grow flex flex-col justify-between"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                          <QrCode className="size-6 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white">Pasaporte Digital de Salud</h4>
                          <p className="text-[10px] text-slate-400 font-mono">Expediente Clínico Único Encriptado</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        CÉDULA CERTIFICADA MINSA
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-slate-200/40 dark:border-zinc-800/40 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-slate-400 dark:text-zinc-500">Titular de Cuenta:</span>
                          <span className="font-black text-slate-700 dark:text-zinc-300">María González</span>
                        </div>
                        <div className="h-px bg-slate-200/50 dark:bg-zinc-800/40" />
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-slate-400 dark:text-zinc-500">Cédula:</span>
                          <span className="font-mono font-black text-slate-700 dark:text-zinc-300">281-190765-0002Y</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-slate-200/40 dark:border-zinc-800/40 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-slate-400 dark:text-zinc-500">PIN Familiar Vinculado:</span>
                          <span className="font-mono font-black text-emerald-500">OASIS-98241</span>
                        </div>
                        <div className="h-px bg-slate-200/50 dark:bg-zinc-800/40" />
                        <p className="text-[9px] text-slate-400 font-light leading-normal">
                          Permite a cuidadores o familiares de la tercera edad autorizar el despacho de sus recetas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 bg-white/40 dark:bg-zinc-900/20 p-3 rounded-xl border border-slate-200/20 dark:border-zinc-800/30 font-light">
                      <Shield className="size-4.5 text-emerald-500 shrink-0" />
                      Los datos médicos están encriptados y protegidos bajo el estándar internacional HIPAA de privacidad.
                    </div>
                  </motion.div>
                )}

                {/* Medico View */}
                {activeShowcaseTab === 'medico' && (
                  <motion.div
                    key="medico_view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-5 flex-grow flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                          <Stethoscope className="size-6 text-sky-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white">Firma Criptográfica de Recetas</h4>
                          <p className="text-[10px] text-slate-400 font-mono">Respaldo legal inalterable HMAC-SHA256</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-black bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2.5 py-1 rounded-full border border-sky-500/20">
                        REGISTRO MINSA ACTIVO
                      </span>
                    </div>

                    {signedToken ? (
                      <div className="p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex flex-col items-center justify-center text-center space-y-2">
                        <CheckCircle2 className="size-8 text-emerald-500 animate-bounce" />
                        <h5 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">Receta Firmada Con Éxito</h5>
                        <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 max-w-md break-all leading-normal">
                          {signedToken}
                        </p>
                        <button
                          onClick={() => setSignedToken('')}
                          className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 tracking-wider mt-1 cursor-pointer"
                        >
                          Limpiar y firmar otra
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="space-y-2.5">
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal font-light">
                            Introduce tu código PIN de 4 dígitos para firmar criptográficamente el diagnóstico y despacho de medicamentos del paciente:
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="PIN"
                              value={pinInput}
                              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-center w-20 text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
                            />
                            <button
                              onClick={executeDoctorSign}
                              disabled={pinInput.length !== 4 || isSigning}
                              className="flex-grow px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {isSigning ? 'Cifrando...' : 'Firmar Receta'}
                            </button>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-slate-200/40 dark:border-zinc-800/40 space-y-1.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                          <p className="font-extrabold text-slate-400 dark:text-zinc-500 text-[8px] uppercase tracking-wider mb-1">Medicamento a Despachar</p>
                          <p><span className="font-bold text-slate-800 dark:text-zinc-300">Fármaco:</span> Amoxicilina 500mg</p>
                          <p><span className="font-bold text-slate-800 dark:text-zinc-300">Frecuencia:</span> Cada 8 horas / 7 días</p>
                          <p><span className="font-bold text-slate-800 dark:text-zinc-300">Lote FEFO:</span> #AM-2026-X9</p>
                        </div>
                      </div>
                    )}

                    <p className="text-[8px] text-slate-400 dark:text-zinc-500 text-center font-light">
                      La firma digital garantiza el origen de la receta, haciéndola imposible de falsificar o reutilizar en múltiples farmacias.
                    </p>
                  </motion.div>
                )}

                {/* Farmacia View */}
                {activeShowcaseTab === 'farmacia' && (
                  <motion.div
                    key="farmacia_view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-4 flex-grow flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                          <Store className="size-6 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white">Matriz de Control FEFO</h4>
                          <p className="text-[10px] text-slate-400 font-mono">First Expired, First Out (Primer Vencimiento, Primer Despacho)</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        STOCK EN TIEMPO REAL
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200/50 dark:border-zinc-800/40 overflow-hidden bg-white/40 dark:bg-zinc-900/20">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="bg-slate-200/30 dark:bg-zinc-900/60 text-slate-400 dark:text-zinc-500 border-b border-slate-200/50 dark:border-zinc-800">
                            <th className="p-3">Fármaco</th>
                            <th className="p-3">Próximo Vencimiento</th>
                            <th className="p-3 text-center">Lotes (Stock)</th>
                            <th className="p-3 text-right">Precio C$</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: 'Amoxicilina 500mg', date: '12-10-2026', stock: '18 uds', price: 'C$ 85.00' },
                            { name: 'Paracetamol 500mg', date: '04-02-2027', stock: '120 uds', price: 'C$ 12.00' },
                            { name: 'Losartán 50mg', date: '18-11-2026', stock: '45 uds', price: 'C$ 95.00' }
                          ].map((item, idx) => (
                            <tr key={idx} className="border-b last:border-0 border-slate-200/40 dark:border-zinc-800/30 text-slate-700 dark:text-zinc-300">
                              <td className="p-3 font-bold">{item.name}</td>
                              <td className="p-3 font-mono">{item.date}</td>
                              <td className="p-3 text-center font-mono text-emerald-500">{item.stock}</td>
                              <td className="p-3 text-right font-mono font-bold">{item.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[8px] text-slate-400 dark:text-zinc-500 font-mono text-center">
                      El sistema ordena el despacho según la fecha de caducidad más cercana para optimizar inventarios farmacéuticos.
                    </p>
                  </motion.div>
                )}

                {/* Repartidor View */}
                {activeShowcaseTab === 'repartidor' && (
                  <motion.div
                    key="repartidor_view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-4 flex-grow flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                          <Truck className="size-6 text-amber-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white">Rastreo Satelital Activo</h4>
                          <p className="text-[10px] text-slate-400 font-mono">Confirmación de entrega obligatoria con código QR</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                        GPS EN VIVO
                      </span>
                    </div>

                    {/* Animated path */}
                    <div className="relative h-28 bg-white/40 dark:bg-zinc-900/60 border border-slate-200/50 dark:border-zinc-800/40 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                      <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_0.8px,transparent_0.8px)] [background-size:16px_16px] opacity-10" />
                      
                      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M 30,90 C 120,10 180,100 300,50 T 480,20"
                          fill="none"
                          stroke="rgba(245, 158, 11, 0.15)"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 30,90 C 120,10 180,100 300,50 T 480,20"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3.5"
                          strokeDasharray="6 6"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Moving compass bike locator */}
                      <div 
                        className="absolute size-8 rounded-full bg-amber-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-white shadow-lg transition-all duration-300"
                        style={{
                          left: `${deliveryProgress}%`,
                          top: `${45 + Math.sin(deliveryProgress / 8) * 20}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <Truck className="size-4.5 text-white animate-pulse" />
                      </div>

                      <div className="absolute bottom-2 inset-x-4 flex justify-between text-[8px] font-mono text-slate-400 dark:text-zinc-500">
                        <span>Sede Farmacia Oasis León</span>
                        <span>Destino (Paciente)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-slate-200/40 dark:border-zinc-800/40">
                        <span className="font-extrabold text-slate-400 dark:text-zinc-500 uppercase text-[8px]">Progreso de Ruta:</span>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={deliveryProgress}
                            onChange={(e) => setDeliveryProgress(Number(e.target.value))}
                            className="w-16 accent-amber-500 cursor-pointer h-1 rounded"
                          />
                          <span className="font-mono font-black text-amber-500">{deliveryProgress}%</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-slate-200/40 dark:border-zinc-800/40 flex items-center justify-center gap-1 font-black text-slate-700 dark:text-zinc-300">
                        <Smartphone className="size-3.5 text-amber-500" />
                        <span>Firma por Código QR</span>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ============ INTERACTIVE TAX & senior calculator ============ */}
        <section id="calculadora" className="py-20 bg-slate-100/60 dark:bg-zinc-950/40 border-y border-slate-200/50 dark:border-zinc-900 relative z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left explanation column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">
                  Cumplimiento Automatizado Ley 160 y 822
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white uppercase leading-tight">
                  Simulador de Exenciones y Descuentos
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-light leading-relaxed">
                  En Oasis Nicaragua la facturación es transparente. Nuestra terminal POS y el backend aplican automáticamente las rebajas por ley según la cédula y el catálogo oficial.
                </p>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                      <Percent className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Ley 160 (Adulto Mayor)</h4>
                      <p className="text-[11px] text-slate-400 font-light leading-relaxed mt-0.5">
                        Exige un descuento del 20% en medicamentos generales y 30% en consultas privadas a ciudadanos mayores de 60 años.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="size-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Ley 822 (Exoneración de IVA)</h4>
                      <p className="text-[11px] text-slate-400 font-light leading-relaxed mt-0.5">
                        Exonera del 15% de IVA a la lista nacional de medicamentos esenciales emitida por el Ministerio de Salud.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right calculator interactive widget column */}
              <div className="lg:col-span-7">
                <div className="clay-card rounded-[2rem] p-6 sm:p-8 bg-white border border-slate-200/50 dark:border-zinc-800/40 shadow-xl flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="size-5 text-emerald-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">Calculadora de Leyes</h3>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-500 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                      Algoritmo POS activo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* Controls */}
                    <div className="space-y-4">
                      
                      {/* Age range */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400">Edad del Ciudadano:</label>
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={userAge}
                            onChange={(e) => setUserAge(Number(e.target.value))}
                            className="w-full accent-emerald-500 h-1.5 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold font-mono text-slate-800 dark:text-white w-10 text-right">{userAge} años</span>
                        </div>
                        {hasSeniorDiscount && (
                          <p className="text-[9px] text-emerald-500 font-black uppercase tracking-wide">
                            ✓ Aplica Ley 160 (Adulto Mayor)
                          </p>
                        )}
                      </div>

                      {/* Product Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Servicio:</label>
                        <select
                          value={selectedProductType}
                          onChange={(e) => setSelectedProductType(e.target.value as any)}
                          className="w-full p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 focus:outline-none"
                        >
                          <option value="medicamento_esencial">Medicamento Esencial (Exento IVA Ley 822)</option>
                          <option value="medicamento_general">Medicamento General (Con 15% IVA)</option>
                          <option value="consulta">Consulta Médica Especializada (Con 15% IVA)</option>
                        </select>
                      </div>

                      {/* Base Price input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400">Precio Base (C$):</label>
                        <input
                          type="number"
                          min="10"
                          value={basePrice}
                          onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value)))}
                          className="w-full p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold font-mono text-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>

                    </div>

                    {/* Results Box */}
                    <div className="p-5 rounded-2xl bg-slate-100/50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/30 flex flex-col justify-between gap-4 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal Base:</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-300">C$ {calcDetails.subtotal}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>IVA (15%):</span>
                          {calcDetails.ivaExempt ? (
                            <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                              Exento IVA
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800 dark:text-zinc-300">C$ {calcDetails.iva}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                          <span>Descuento Ley 160:</span>
                          <span>- C$ {calcDetails.discount} ({calcDetails.discountRate}%)</span>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-zinc-800/80" />

                      <div className="flex justify-between items-center text-xs font-black text-slate-800 dark:text-white">
                        <span>PRECIO TOTAL POS:</span>
                        <span className="text-sm font-black text-emerald-500">C$ {calcDetails.total}</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ============ ECOSISTEMA BENTO CARDS ============ */}
        <section id="ecosistema" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto relative z-10">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
              Ecosistema de 4 Dimensiones
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-light max-w-xl mx-auto">
              Cada rol en la red cuenta con su propio portal y herramientas específicas optimizadas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Pasaporte Paciente',
                icon: <Heart className="size-6 text-emerald-500" />,
                desc: 'Agenda consultas, almacena recetas con QR e integra a tu familia con PIN.',
                features: ['Recetas inviolables', 'Despacho automático', 'Control de tutores']
              },
              {
                title: 'Firma Médicos',
                icon: <Stethoscope className="size-6 text-teal-400" />,
                desc: 'Valida tu registro MINSA, gestiona turnos de pacientes y firma digitalmente con PIN.',
                features: ['Firma HMAC-SHA256', 'Historial clínico', 'Filtro de diagnósticos']
              },
              {
                title: 'Inventario Farmacia',
                icon: <Store className="size-6 text-sky-400" />,
                desc: 'Control de lotes FEFO, buscador de disponibilidad y cobros exentos de ley.',
                features: ['Algoritmo FEFO activo', 'Cuentas multimoneda', 'Exenciones de IVA']
              },
              {
                title: 'Logística de Delivery',
                icon: <Truck className="size-6 text-amber-500" />,
                desc: 'Seguimiento por GPS satelital en vivo, optimización de rutas y cierres por código QR.',
                features: ['Rastreo GPS activo', 'Rutas OSRM óptimas', 'Verificación QR en puerta']
              }
            ].map((card, idx) => (
              <div 
                key={idx} 
                className="clay-card p-6 bg-white/40 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/40 rounded-[2rem] flex flex-col justify-between gap-6 hover:-translate-y-2 transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 dark:text-zinc-200 group-hover:text-emerald-500 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-light mt-1.5 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 border-t border-slate-200/40 dark:border-zinc-900 pt-4 text-[10px] text-slate-600 dark:text-zinc-300">
                  {card.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ============ LOGROS DE LA COMUNIDAD EN CIFRAS ============ */}
        <section className="py-16 px-4 bg-slate-100/40 dark:bg-white/[0.01] border-y border-slate-200/50 dark:border-white/5 relative z-10">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Pacientes Cuidados', value: 12000, suffix: '+', desc: 'Salud asistida y protegida' },
              { label: 'Médicos Acreditados', value: 620, suffix: '+', desc: 'Firmas digitales activas' },
              { label: 'Farmacias Afiliadas', value: 150, suffix: '+', desc: 'Inventarios en línea' },
              { label: 'Entregas Concretadas', value: 99.8, suffix: '%', desc: 'Surtido inmediato' }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="text-4xl font-extrabold text-slate-800 dark:text-white font-mono leading-none">
                  <CounterAnimation value={stat.value} suffix={stat.suffix} />
                </h3>
                <p className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300 tracking-wider">
                  {stat.label}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-light">
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ AYUDA & ACCORDION FAQS ============ */}
        <section id="ayuda" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto relative z-10">
          <div className="text-center space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">
              Centro de Ayuda
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-slate-800 dark:text-white">
              Preguntas Frecuentes
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-light">
              Respuestas rápidas para entender el ecosistema y la normativa médica de Oasis.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Cómo funciona la receta criptográfica con código QR?',
                a: 'Cuando un médico emite una receta, el sistema genera una firma criptográfica única mediante HMAC-SHA256 codificada en un código QR. Las farmacias validan esta receta escaneando el QR desde su terminal, garantizando que el documento sea auténtico y no haya sido duplicado.'
              },
              {
                q: '¿Cumple con las regulaciones del MINSA en Nicaragua?',
                a: 'Sí. Todas las recetas registran el código de registro MINSA del médico correspondiente y se firman electrónicamente de acuerdo con las normativas legales de recetas médicas del Ministerio de Salud (MINSA) en Nicaragua.'
              },
              {
                q: '¿Cómo se aplican los descuentos de Adulto Mayor (Ley 160)?',
                a: 'Nuestra terminal de Punto de Venta (POS) lee la fecha de nacimiento de la cédula del paciente y aplica automáticamente el descuento legal del 20% en medicamentos y 30% en consultas médicas para mayores de 60 años.'
              },
              {
                q: '¿Es gratuito para los pacientes?',
                a: 'Sí, el registro, la agenda de citas digitales y el almacenamiento de tu historial de salud en tu pasaporte digital de salud son completamente gratuitos para todos los ciudadanos.'
              }
            ].map((faq, idx) => {
              const [isOpen, setIsOpen] = useState(false);
              return (
                <div 
                  key={idx} 
                  className="clay-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-md"
                >
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full p-5 flex items-center justify-between text-left gap-4 font-bold text-xs uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={cn("size-4 text-emerald-500 transition-transform duration-300 shrink-0", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400 font-light border-t border-slate-100 dark:border-zinc-900/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ============ FINAL CALL TO ACTION ============ */}
        <section className="py-20 px-4 max-w-4xl mx-auto relative z-10">
          <div className="clay-card rounded-[2.5rem] p-10 sm:p-16 text-center relative overflow-hidden bg-white/40 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/40 backdrop-blur-2xl">
            <div className="absolute -top-24 -right-24 size-64 bg-emerald-500/5 rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 size-64 bg-sky-500/5 rounded-full pointer-events-none" />

            <div className="flex justify-center mb-6">
              <AnimatedLogo size="lg" showLabel={true} />
            </div>

            <h2 className="text-3xl sm:text-5xl font-black mb-4 text-slate-800 dark:text-white leading-tight">
              Toma el control de tu salud familiar hoy
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 mb-8 max-w-xl mx-auto font-light text-sm sm:text-base">
              Únete gratis a la red de salud digital más segura, rápida y de mayor cobertura de Nicaragua.
            </p>

            <button
              onClick={() => router.push('/registro')}
              className="px-10 py-5 rounded-2xl text-base font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
            >
              Comenzar ahora gratis
              <ArrowRight className="size-5 ml-2 inline" />
            </button>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold flex items-center gap-1.5 justify-center mt-4">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Registro 100% gratuito • Cumplimiento MINSA
            </p>
          </div>
        </section>

        {/* ============ PREMIUM FOOTER ============ */}
        <footer className="relative z-10 border-t border-slate-200/50 dark:border-white/5 py-10 bg-white/20 dark:bg-black/20 text-center sm:text-left">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <AnimatedLogo size="sm" showLabel={true} />
              <span className="text-[8px] font-mono text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded">
                v0.2.0
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              © 2026 Oasis Nicaragua. Cumplimiento Regulador MINSA • Ley 160 / Ley 822.
            </p>

            <div className="flex gap-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              <a href="#" className="hover:text-emerald-500">Términos</a>
              <a href="#" className="hover:text-emerald-500">Privacidad</a>
              <a href="#" className="hover:text-emerald-500">Contacto</a>
            </div>
          </div>
        </footer>

        {/* ============ COPILOT HELPER (BOTTOM RIGHT) ============ */}
        {showCopilot && (
          <div className="fixed bottom-6 right-6 z-[100] max-w-xs w-full pointer-events-auto bg-white/95 dark:bg-zinc-950/95 border-2 border-emerald-500/20 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Oasis Copiloto
                </span>
              </div>
              <button 
                onClick={() => setShowCopilot(false)} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-zinc-300 font-light">
              {copilotMessage}
            </p>
            <div className="flex gap-1.5 pt-1">
              <button
                onClick={() => {
                  setActiveShowcaseTab('medico');
                  setCopilotMessage('Modo médico activo. Introduce un PIN de 4 dígitos (ej: 1234) en la sección de arriba para firmar una receta en el simulador.');
                  const element = document.getElementById('demostración');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-[9px] font-black uppercase tracking-wider p-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 cursor-pointer transition-all flex-1 text-center"
              >
                Simular Firma
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('calculadora');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                  setCopilotMessage('Desplázate por el simulador de leyes. Cambia tu edad o tipo de servicio para ver el cálculo automático del descuento de Ley 160 y la exención del IVA.');
                }}
                className="text-[9px] font-black uppercase tracking-wider p-2 rounded-lg bg-teal-500/5 hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/10 cursor-pointer transition-all flex-1 text-center"
              >
                Simular Leyes
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
