'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { RotateCcw, AlertTriangle, Home } from 'lucide-react';
import { OrganicBlobs } from '@/components/oasis/organic-blobs';

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an analytics or reporting service
    console.error('OASIS CRITICAL EXCEPTION:', error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 bg-[#FAFAFA] dark:bg-[#05070c] transition-colors duration-500 overflow-hidden select-none">
      <OrganicBlobs />

      {/* Background Gradient Auras */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-red-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[110px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        <div className="bg-white/40 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/60 shadow-2xl rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl space-y-6">
          
          {/* Custom ECG Flatline / Distortion SVG Vector Illustration */}
          <div className="relative w-full max-w-[280px] mx-auto drop-shadow-2xl">
            <svg
              viewBox="0 0 240 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto text-red-500 dark:text-red-400"
            >
              {/* EKG Grid background */}
              <line x1="20" y1="100" x2="220" y2="100" className="stroke-slate-200 dark:stroke-zinc-800 stroke-1 stroke-dasharray-[2,4]" />
              <line x1="120" y1="20" x2="120" y2="180" className="stroke-slate-200 dark:stroke-zinc-800 stroke-1 stroke-dasharray-[2,4]" />
              
              {/* Grid Box Patterns */}
              <rect x="20" y="20" width="200" height="160" rx="4" className="stroke-slate-200/50 dark:stroke-zinc-800/30 stroke-1" />

              {/* Distorted ECG Pulse Line */}
              <path
                d="M 20 100 L 70 100 L 80 85 L 90 115 L 100 100 L 120 100 L 125 45 L 132 170 L 140 100 L 150 100 L 155 110 L 160 90 L 165 100 L 180 100 C 190 100 195 108 200 90 C 205 72 210 118 220 100"
                className="stroke-red-500 dark:stroke-red-400 stroke-3 stroke-round stroke-linejoin-round"
                strokeDasharray="400"
                strokeDashoffset="0"
              />

              {/* Interruption Sparks */}
              <circle cx="125" cy="45" r="4" className="fill-amber-500 animate-ping" />
              <path d="M125 41L128 35" className="stroke-amber-500 stroke-2" />
              <path d="M120 45L114 44" className="stroke-amber-500 stroke-2" />
              <path d="M129 48L134 51" className="stroke-amber-500 stroke-2" />

              {/* Cardiac Flatline Indicator Dot */}
              <circle cx="220" cy="100" r="4" className="fill-red-500 animate-pulse" />
              
              {/* Central Floating Warning Triangle Card */}
              <g transform="translate(100, 75)">
                {/* Neon Aura */}
                <rect x="-3" y="-3" width="46" height="46" rx="23" className="fill-red-500/10 dark:fill-red-500/5" />
                <circle cx="20" cy="20" r="16" className="fill-white dark:fill-zinc-950 stroke-red-500 dark:stroke-red-400 stroke-2" />
                <path d="M20 11V22M20 26H20.01" className="stroke-red-500 dark:stroke-red-400 stroke-2 stroke-linecap-round" />
              </g>
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider font-sans">
              Anomalía en el Ecosistema
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-light leading-relaxed max-w-sm mx-auto">
              Nuestros servidores de telemedicina reportan una anomalía o caída de conexión. Por favor reintenta la acción.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100/50 dark:bg-zinc-900/30 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 border border-slate-200/30 dark:border-zinc-800/30 text-slate-500 dark:text-zinc-400 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="size-4 animate-spin-reverse" />
              Reintentar
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Home className="size-4" />
              Ir al Inicio
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
