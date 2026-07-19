'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Heart, Compass, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isVisible: boolean;
}

export function LoadingScreen({ isVisible }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);

  const logs = [
    'Preparando la experiencia...',
    'Cargando interfaz...',
    'Iniciando Oasis...',
  ];

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setLogIndex(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        const step = Math.floor(Math.random() * 15) + 8;
        return Math.min(100, prev + step);
      });
    }, 100);

    const logInterval = setInterval(() => {
      setLogIndex((prev) => (prev < logs.length - 1 ? prev + 1 : prev));
    }, 850);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.05,
            filter: 'blur(8px)',
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
          }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#FAF9F6] dark:bg-[#060B0A] text-slate-800 dark:text-zinc-100 overflow-hidden select-none transition-colors duration-500"
        >
          {/* Subtle Cyberpunk Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#10B981_0.5px,transparent_0.5px)] [background-size:20px_20px] opacity-10 dark:opacity-[0.03] pointer-events-none" />

          {/* Ambient Colorful Light Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.16, 0.1],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-1/4 -right-1/4 size-[450px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 blur-[100px]"
            />
            <motion.div
              animate={{
                scale: [1.1, 0.95, 1.1],
                opacity: [0.08, 0.14, 0.08],
              }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-1/4 -left-1/4 size-[450px] rounded-full bg-gradient-to-br from-teal-500/10 to-sky-500/10 blur-[100px]"
            />
          </div>

          {/* Central Container */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full px-8 text-center">
            
            {/* Custom SVG Geometric Loader */}
            <div className="relative size-48 flex items-center justify-center mb-8">
              
              {/* Pulsing Backglow */}
              <div className="absolute inset-4 rounded-full bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-xl" />

              {/* Breathtaking SVG Radar & Heartbeat Pulse */}
              <svg viewBox="0 0 100 100" className="size-44 select-none pointer-events-none">
                
                {/* 1. Outer dashed ring rotating clockwise */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="fill-none stroke-emerald-500/20 dark:stroke-emerald-400/10 stroke-[1.5]"
                  strokeDasharray="24 16 8 16"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '50px 50px' }}
                />

                {/* 2. Middle dashed ring rotating counter-clockwise */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="37"
                  className="fill-none stroke-teal-500/35 dark:stroke-teal-400/20 stroke-[2]"
                  strokeDasharray="14 10 4 10"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '50px 50px' }}
                />

                {/* 3. Concentric ticking dots */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="29"
                  className="fill-none stroke-emerald-500/10 dark:stroke-emerald-500/[0.05] stroke-[1] stroke-dasharray-[1_12]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '50px 50px' }}
                />

                {/* 4. Heartbeat ECG Pulse Wave drawing itself */}
                <motion.path
                  d="M 28,50 H 38 L 41,38 L 44,62 L 47,45 L 49,53 L 51,50 H 72"
                  fill="none"
                  className="stroke-emerald-500 dark:stroke-emerald-400 stroke-[2.5]"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0.2 }}
                  animate={{ 
                    pathLength: [0, 1, 1],
                    pathOffset: [0, 0, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ 
                    duration: 2.2, 
                    repeat: Infinity, 
                    ease: 'easeInOut' 
                  }}
                />

                {/* 5. Custom Geometric Medical Heart-Leaf Emblem in center */}
                <g className="fill-emerald-500 dark:fill-emerald-400">
                  {/* Top segment */}
                  <path d="M 50,18 C 50.8,18 51.5,18.7 51.5,19.5 V 23.5 C 51.5,24.3 50.8,25 50,25 C 49.2,25 48.5,24.3 48.5,23.5 V 19.5 C 48.5,18.7 49.2,18 50,18 Z" />
                  {/* Bottom segment */}
                  <path d="M 50,75 C 50.8,75 51.5,74.3 51.5,73.5 V 69.5 C 51.5,68.7 50.8,68 50,68 C 49.2,68 48.5,68.7 48.5,69.5 V 73.5 C 48.5,74.3 49.2,75 50,75 Z" />
                  {/* Left segment */}
                  <path d="M 18,50 C 18,49.2 18.7,48.5 19.5,48.5 H 23.5 C 24.3,48.5 25,49.2 25,50 C 25,50.8 24.3,51.5 23.5,51.5 H 19.5 C 18.7,51.5 18,50.8 18,50 Z" />
                  {/* Right segment */}
                  <path d="M 75,50 C 75,49.2 74.3,48.5 73.5,48.5 H 69.5 C 68.7,48.5 68,49.2 68,50 C 68,50.8 68.7,51.5 69.5,51.5 H 73.5 C 74.3,51.5 75,50.8 75,50 Z" />
                </g>

              </svg>
            </div>

            {/* Typography Header */}
            <div className="space-y-1 mb-6">
              <h2 className="text-[10px] font-black tracking-[0.5em] uppercase text-emerald-600 dark:text-emerald-400 pl-[0.5em]">
                Oasis
              </h2>
              <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase tracking-widest">
                Ecosistema de Salud Conectada
              </p>
            </div>

            {/* Log Status Monitor */}
            <div className="w-full rounded-2xl bg-white/60 dark:bg-zinc-950/40 border border-slate-200/50 dark:border-zinc-900/60 p-4 shadow-sm backdrop-blur-md">
              <div className="h-8 flex flex-col justify-center items-center">
                <AnimatePresence mode="popLayout">
                  <motion.p
                    key={logIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5 justify-center"
                  >
                    <Sparkles className="size-3.5 text-emerald-500 animate-spin-slow shrink-0" />
                    {logs[logIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Progress Percentage Indicator */}
            <div className="mt-8 flex flex-col items-center w-full max-w-[220px] space-y-2">
              <div className="flex items-center justify-between w-full text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 tracking-widest uppercase">
                <span>Cargando experiencia</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{progress}%</span>
              </div>
              
              <div className="w-full h-1 bg-slate-200 dark:bg-zinc-900 rounded-full overflow-hidden relative">
                <motion.div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Compliance Footer */}
            <div className="mt-10 flex items-center justify-center gap-4 text-[8px] font-black tracking-widest text-slate-400 dark:text-zinc-600 uppercase">
              <div className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                MINSA COMPLIANT
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Heart className="size-3.5 text-emerald-500 animate-pulse" />
                HIPAA PROTECTED
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Compass className="size-3.5 text-sky-500 animate-spin-slow" />
                GPS LINKED
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
