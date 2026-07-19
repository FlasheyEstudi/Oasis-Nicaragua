'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import { OrganicBlobs } from '@/components/oasis/organic-blobs';

export default function Pagina404() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 bg-[#FAFAFA] dark:bg-[#05070c] transition-colors duration-500 overflow-hidden select-none">
      <OrganicBlobs />

      {/* Background Gradient Auras */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-sky-500/5 rounded-full blur-[110px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        <div className="bg-white/40 dark:bg-zinc-950/20 border border-slate-200/50 dark:border-zinc-800/60 shadow-2xl rounded-[2.5rem] p-8 md:p-10 backdrop-blur-3xl space-y-6">
          
          {/* Custom Premium Desert & Oasis SVG Vector Illustration */}
          <div className="relative w-full max-w-[280px] mx-auto drop-shadow-2xl">
            <svg
              viewBox="0 0 240 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto text-teal-500 dark:text-teal-400"
            >
              {/* Sky Backdrop & Stars */}
              <circle cx="45" cy="40" r="1.5" className="fill-slate-300 dark:fill-zinc-700 animate-pulse" />
              <circle cx="195" cy="50" r="1" className="fill-slate-300 dark:fill-zinc-700" />
              <circle cx="120" cy="25" r="1.2" className="fill-slate-300 dark:fill-zinc-700 animate-pulse" style={{ animationDelay: '0.8s' }} />
              <circle cx="75" cy="70" r="1" className="fill-slate-300 dark:fill-zinc-700" />
              
              {/* Moon with Glowing Ring */}
              <circle cx="160" cy="50" r="24" className="fill-sky-500/5 dark:fill-sky-500/5 stroke-sky-500/10 stroke-1" />
              <path
                d="M174.5 35.5C168.5 30 156.5 32 150 39.5C143.5 47 144.5 59.5 151.5 65C142.5 61 138 49 143.5 39.5C149 30 162.5 27.5 174.5 35.5Z"
                className="fill-slate-200 dark:fill-zinc-800"
              />

              {/* Sand Dunes Back */}
              <path
                d="M10 140C70 120 120 160 230 135V180H10V140Z"
                className="fill-slate-200/50 dark:fill-zinc-900/40"
              />

              {/* Sand Dunes Front */}
              <path
                d="M10 165C90 140 150 175 230 150V180H10V165Z"
                className="fill-slate-100 dark:fill-zinc-900/80"
              />

              {/* Distant Empty Oasis Lakebed outline */}
              <ellipse cx="120" cy="165" rx="35" ry="10" className="stroke-teal-500/30 dark:stroke-teal-400/20 fill-teal-500/5 stroke-1" />
              
              {/* Dead Cactus / Plant silhouette */}
              <path
                d="M45 160V125M45 140H38V130M45 148H52V138"
                className="stroke-slate-300 dark:stroke-zinc-800 stroke-2 stroke-round"
              />

              {/* Dead Tree silhouette */}
              <path
                d="M185 155V115M185 135L195 125M185 130L175 120M185 122L190 115"
                className="stroke-slate-300 dark:stroke-zinc-800 stroke-2 stroke-round"
              />

              {/* Stylized Floating 404 Indicator Signpost */}
              <g transform="translate(100, 75)">
                {/* Sign Post */}
                <rect x="18" y="25" width="4" height="40" rx="2" className="fill-slate-300 dark:fill-zinc-800" />
                
                {/* Sign Board */}
                <rect x="0" y="0" width="40" height="26" rx="8" className="fill-white dark:fill-zinc-950 stroke-teal-500 dark:stroke-teal-400 stroke-2 shadow-lg" />
                
                {/* 404 Text */}
                <text
                  x="20"
                  y="17"
                  textAnchor="middle"
                  className="font-black text-xs font-sans tracking-wide fill-slate-800 dark:fill-white text-[11px]"
                >
                  404
                </text>
              </g>
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider font-sans">
              El Oasis se ha Evaporado
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-light leading-relaxed max-w-sm mx-auto">
              La dirección digital que buscas no existe o fue reubicada temporalmente. Vuelve al inicio o regresa a tu portal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100/50 dark:bg-zinc-900/30 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 border border-slate-200/30 dark:border-zinc-800/30 text-slate-500 dark:text-zinc-400 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="size-4" />
              Atrás
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
